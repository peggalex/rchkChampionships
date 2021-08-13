from makeRequest import makeRequest
from bs4 import BeautifulSoup
from datetime import timedelta
import time
from Schema import *
from SqliteLib import *
from serverUtilities import assertGoodRequest 

WIN_STR = "VICTORY"
REGION = "JP1"
API_KEY = "RGAPI-076f8edd-fec8-4e01-bd7d-23f8797205d6"
URL_ENCODED_BACKSLASH = '%2F'
DEFAULT_ICON = 29
BLUE_SIDE, RED_SIDE = 100, 200 # "100 for blue side. 200 for red side." (developer.riotgames.com/apis#match-v4)

CHAMPS_ID_TO_NAME = {}
CHAMPS_JSON_URL = lambda leagueVersion: f"http://ddragon.leagueoflegends.com/cdn/{leagueVersion}/data/en_US/champion.json"

def UpdateChampsIdToName(leagueVersion: str):
    global CHAMPS_ID_TO_NAME

    champsJson = makeRequest(CHAMPS_JSON_URL(leagueVersion))["data"]
    CHAMPS_ID_TO_NAME = {int(v["key"]): k for k,v in champsJson.items()}
    
def GetChamp(id: int, GetUpdateLeagueVersion: '(bool?) -> str') -> str:
    if id not in CHAMPS_ID_TO_NAME:
        UpdateChampsIdToName(GetUpdateLeagueVersion(force=True))
        if id not in CHAMPS_ID_TO_NAME:
            raise Exception(f"champion id: '{id}' invalid.")
    return CHAMPS_ID_TO_NAME[id]

SUMMONERS_ID_TO_NAME = {}
SUMONERS_JSON_URL = lambda leagueVersion: f"http://ddragon.leagueoflegends.com/cdn/{leagueVersion}/data/en_US/summoner.json"

def UpdateSummonersIdToName(leagueVersion):
    global SUMMONERS_ID_TO_NAME
    
    summonersJson = makeRequest(SUMONERS_JSON_URL(leagueVersion))["data"]
    SUMMONERS_ID_TO_NAME = {int(v["key"]): k for k,v in summonersJson.items()}

def GetSummoner(id: int, GetUpdateLeagueVersion: '(bool?) -> str') -> str:
    if id not in SUMMONERS_ID_TO_NAME:
        UpdateSummonersIdToName(GetUpdateLeagueVersion(force=True))
        if id not in SUMMONERS_ID_TO_NAME:
            raise Exception(f"summoner id: '{id}' invalid.")
    return SUMMONERS_ID_TO_NAME[id]


KEYSTONE_ID_TO_URL = {}
PERK_LIST_URL = lambda leagueVersion: f"http://ddragon.leagueoflegends.com/cdn/{leagueVersion}/data/en_US/runesReforged.json"
# thank you so much to stackoverflow question 64043232

def UpdateKeystoneIdToName(leagueVersion: str):
    global KEYSTONE_ID_TO_URL
    
    perks = makeRequest(PERK_LIST_URL(leagueVersion))
    for p in perks:
        for keystone in p['slots'][0]['runes']:
            KEYSTONE_ID_TO_URL[keystone['id']] = keystone['icon']

def GetKeystone(id: int, GetUpdateLeagueVersion: '(bool?) -> str') -> str:
    if id not in KEYSTONE_ID_TO_URL:
        UpdateKeystoneIdToName(GetUpdateLeagueVersion(force=True))
        if id not in KEYSTONE_ID_TO_URL:
            raise Exception(f"keystone id: '{id}' invalid.")
    return KEYSTONE_ID_TO_URL[id]


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

def addPlayers(cursor, riotData, championToAccIdAndName, GetUpdateLeagueVersion: '(bool?) -> str'):
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
        champion = GetChamp(participant["championId"], GetUpdateLeagueVersion)
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

            spell1=GetSummoner(participant["spell1Id"], GetUpdateLeagueVersion),
            spell2=GetSummoner(participant["spell2Id"], GetUpdateLeagueVersion),

            kp=kp,
            dmgDealt=stats["totalDamageDealtToChampions"],
            dmgTaken=stats["totalDamageTaken"],
            gold=stats["goldEarned"],

            keyStoneUrl=GetKeystone(stats["perk0"], GetUpdateLeagueVersion),

            healing=stats["totalHeal"],
            vision=stats["visionScore"],
            ccTime=stats["timeCCingOthers"],
            firstBlood=stats["firstBloodKill"],
            turrets=stats["turretKills"],
            inhibs=stats["inhibitorKills"],

            items=[stats[f"item{i}"] for i in range(7)]
        )

def addMatch(cursor, html, GetUpdateLeagueVersion: '(bool?) -> str'):

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

    addPlayers(cursor, riotRes, getChampionToAccIdAndName(soup), GetUpdateLeagueVersion)
    addTeam(cursor, riotRes)

    AddMatch(cursor, matchId, redSideWon, gameLength, date)

    print(gameLength, matchId, redSideWon)
    return date