from bs4 import BeautifulSoup
from datetime import timedelta
import time
import requests
import re
import json
import quopri
from Schema import *
from SqliteLib import *
from serverUtilities import assertGoodRequest 

WIN_STR = "VICTORY"
REGION = "JP1"
API_KEY = "RGAPI-076f8edd-fec8-4e01-bd7d-23f8797205d6"
URL_ENCODED_BACKSLASH = '%2F'
DEFAULT_ICON = 29
BLUE_SIDE, RED_SIDE = 100, 200 # "100 for blue side. 200 for red side." (developer.riotgames.com/apis#match-v4)

def makeRequest(query: str, level = 0):
    if 6 < level:
        raise Exception("too many timeouts")

    res = requests.get(query)
    if res.status_code != 200:

        if res.status_code == 429:
            retryAfter = int(res.headers['Retry-After'])
            print(f"retry after {retryAfter} secs")
            time.sleep(retryAfter)
            return makeRequest(query, level + 1)

        elif res.status_code == 404:
            raise Exception("404: url not found")

        else:
            print(f"received error code ({res.status_code}): {level}")
            time.sleep(1)
            return makeRequest(query, level + 1)
    return res.json()

CHAMPS_ID_TO_NAME = {}
CHAMPS_JSON_URL = "http://ddragon.leagueoflegends.com/cdn/11.12.1/data/en_US/champion.json"

def UpdateChampsIdToName():
    global CHAMPS_ID_TO_NAME

    champsJson = makeRequest(CHAMPS_JSON_URL)["data"]
    CHAMPS_ID_TO_NAME = {int(v["key"]): k for k,v in champsJson.items()}
    
def GetChamp(id: int) -> str:
    if id in CHAMPS_ID_TO_NAME:
        return CHAMPS_ID_TO_NAME[id]
    else:
        UpdateChampsIdToName()
        if id not in CHAMPS_ID_TO_NAME:
            raise Exception(f"champion id: '{id}' invalid.")
        return CHAMPS_ID_TO_NAME[id]

SUMMONERS_ID_TO_NAME = {}
SUMONERS_JSON_URL = "http://ddragon.leagueoflegends.com/cdn/11.12.1/data/en_US/summoner.json"

def UpdateSummonersIdToName():
    global SUMMONERS_ID_TO_NAME
    
    summonersJson = makeRequest(SUMONERS_JSON_URL)["data"]
    SUMMONERS_ID_TO_NAME = {int(v["key"]): k for k,v in summonersJson.items()}

def GetSummoner(id: int) -> str:
    if id in SUMMONERS_ID_TO_NAME:
        return SUMMONERS_ID_TO_NAME[id]
    else:
        UpdateSummonersIdToName()
        if id not in SUMMONERS_ID_TO_NAME:
            raise Exception(f"summoner id: '{id}' invalid.")

def text(soup):
    return soup.text.strip() 

def getIcon(summonerName, region):
    try:
        iconUrl = f"https://{region.lower()}.api.riotgames.com/lol/summoner/v4/summoners/by-name/{summonerName}?api_key={API_KEY}"
        return makeRequest(iconUrl)["profileIconId"]
    except:
        return 29

def decodeUtf8(s):
    # thank you so much https://stackoverflow.com/a/26882319
    # example: b\\xc4\\xb1g => bıg
    try:
        return s.encode('latin1').decode('unicode_escape').encode('latin1').decode('utf8')
    except:
        return s

def getChampionToAccIdAndName(soup: BeautifulSoup):
    championToAccIdAndName = {}

    teams = soup.select(f".team.team-{RED_SIDE},.team.team-{BLUE_SIDE}")
    for teamContainer in teams:

        for playerContainer in teamContainer.select('li'):
            champion = playerContainer.select('.champion-icon > div')[0]['data-rg-id']
            playerLink = playerContainer.select('.champion-nameplate-name > div > a')[0]
            name = decodeUtf8(text(playerLink))
            accountId = playerLink['href'].split('/')[-1]

            championToAccIdAndName[champion] = {
                PLAYER_ACCOUNTID_COL.name: accountId,
                PLAYER_SUMMONERNAME_COL.name: name
            }
    return championToAccIdAndName

def addTeam(cursor, riotData):
    matchId = riotData['gameId']

    for team in riotData["teams"]:
        team["bans"].sort(key=lambda b: b["pickTurn"])
        bans = [CHAMPS_ID_TO_NAME[b["championId"]] for b in team["bans"]]

        AddTeam(
            cursor,
            matchId=matchId,
            isRedSide = int(team["teamId"]) == RED_SIDE,
            dragons=team["dragonKills"],
            barons=team["baronKills"],
            towers=team["towerKills"],
            inhibs=team["inhibitorKills"],
            bans=bans
        )

def addPlayers(cursor, riotData, championToAccIdAndName):
    matchId = riotData['gameId']
    date = riotData['gameDuration']
    region = riotData['platformId']

    teamIdToKills = {}
    for participant in riotData['participants']:
        teamId = participant["teamId"]
        cummKills = teamIdToKills.get(teamId, 0)
        kills = participant["stats"]["kills"]
        teamIdToKills[teamId] = cummKills + kills

    for participant in riotData['participants']:
        champion = GetChamp(participant["championId"])
        accountId = championToAccIdAndName[champion][PLAYER_ACCOUNTID_COL.name]
        name = championToAccIdAndName[champion][PLAYER_SUMMONERNAME_COL.name]
        isRedSide = participant["teamId"] == RED_SIDE

        if not PlayerExits(cursor, accountId):
            start = time.time()
            AddPlayer(cursor, accountId, name, getIcon(name, region))
            print("Time Elasped:", f"{time.time() - start:.2f}")

        elif GetSummonerName(cursor, accountId) != name: # name has changed
            if GetMostRecentGame(cursor, accountId) < date: # must call this before AddTeamPlayer
                UpdatePlayer(cursor, accountId, name, getIcon(name, region))

        stats = participant["stats"]

        kills, assists = stats["kills"], stats["assists"]
        kp = (kills + assists) / teamIdToKills[participant["teamId"]] * 100

        AddTeamPlayer(
            cursor,
            matchId=matchId,
            accountId=accountId,
            isRedSide=isRedSide,
            champion=champion,

            kills=kills,
            deaths=stats["deaths"],
            assists=stats["assists"],
            cs=stats["totalMinionsKilled"]+stats["neutralMinionsKilled"],

            doubles=stats["doubleKills"],
            triples=stats["tripleKills"],
            quadras=stats["quadraKills"],
            pentas=stats["pentaKills"],

            perk1=stats["perkPrimaryStyle"],
            perk2=stats["perkSubStyle"],

            kp=kp,
            dmgDealt=stats["totalDamageDealtToChampions"],
            dmgTaken=stats["totalDamageTaken"],
            gold=stats["goldEarned"],

            spell1=participant["spell1Id"],
            spell2=participant["spell2Id"],

            healing=stats["totalHeal"],
            vision=stats["visionScore"],
            ccTime=stats["timeCCingOthers"],
            firstBlood=stats["firstBloodKill"],
            turrets=stats["turretKills"],
            inhibs=stats["inhibitorKills"],

            items=[stats[f"item{i}"] for i in range(7)]
        )

def addMatch(cursor, html):

    try:
        soup = BeautifulSoup(html, 'html.parser')
    except:
        raise Exception(f"Invalid HTML, make sure to follow steps correctly.")

    assertGoodRequest(
        text(soup.find('title')) == "Match History" and soup.find(id="riotbar-container") is not None,
        "This isn't a League of Legends web page."
    )

    assertGoodRequest(
        len(soup.find(id="main").contents) != 0,
        "HTML is valid but you have provided the page source without the content loaded, please follow the instructions correctly."
    )

    matchUrl = soup.select('.mail-button')[0]['href']
    region = matchUrl.split(URL_ENCODED_BACKSLASH)[-3]
    matchId = matchUrl.split(URL_ENCODED_BACKSLASH)[-2]
    assertGoodRequest(
        not MatchExists(cursor, matchId),
        f"Match with id '{matchId}' already registered."
    )
    
    assertGoodRequest(
        region == REGION,
        f"Match is in region: '{region}', should be in '{REGION}'"
    )
    
    gameMap = text(soup.select('.player-header-mode > div')[0])
    gameType = text(soup.select('.player-header-queue > div')[0])
    
    assertGoodRequest(
        gameType.lower() == "custom",
        f"Only custom games allowed{f', this game is {gameType}' if gameType else ''}"
    )

    assertGoodRequest(
        gameMap.lower() == "summoner's rift",
        f"Only summoner's rift games are allowed, this game is '{gameMap}'"
    )

    matchApi = f"https://{region.lower()}.api.riotgames.com/lol/match/v4/matches/{matchId}?api_key={API_KEY}"
    riotRes = makeRequest(matchApi)

    date = riotRes["gameCreation"]

    assertGoodRequest(
        riotRes["queueId"] == 0,
        f"Only custom games are allowed"
    )
    assertGoodRequest(
        riotRes["gameMode"] == "CLASSIC",
        f"Only classic are allowed, this game is of type '{riotRes['gameMode']}'"
    )

    gameLength = riotRes["gameDuration"]

    redTeam = [t for t in riotRes["teams"] if t["teamId"] == RED_SIDE][0]
    redSideWon = redTeam["win"] == "Win"

    addPlayers(cursor, riotRes, getChampionToAccIdAndName(soup))
    addTeam(cursor, riotRes)

    AddMatch(cursor, matchId, redSideWon, gameLength, date)

    print(gameLength, matchId, redSideWon)
    return date