from bs4 import BeautifulSoup
from datetime import timedelta
import time
import requests
import re
import json
import quopri
from Schema import *
from SqliteLib import *

WIN_STR = "VICTORY"
REGION = "JP1"
API_KEY = "RGAPI-076f8edd-fec8-4e01-bd7d-23f8797205d6"
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

def getSoup(html, isEncoded):
    inp = str(quopri.decodestring(html)) if isEncoded else html
    return BeautifulSoup(inp, 'html.parser')

def decodeUtf8(s):
    # thank you so much https://stackoverflow.com/a/26882319
    # example: b\\xc4\\xb1g => bıg
    try:
        return s.encode('latin1').decode('unicode_escape').encode('latin1').decode('utf8')
    except:
        return s

def addPlayer(cursor, playerContainer, matchId, gameLength, isRedSide):

    champion = playerContainer.select('.champion-icon > div')[0]['data-rg-id']
    playerLink = playerContainer.select('.champion-nameplate-name > div > a')[0]
    name = decodeUtf8(text(playerLink))
    accountId = playerLink['href'].split('/')[-1]

    cs = text(playerContainer.select('.minions-col > div')[0])
    csMin = int(cs) / (gameLength / 60)

    k,d,a = [text(x) for x in playerContainer.select('.kda-kda > div')]

    if not PlayerExits(cursor, accountId):
        try:
            iconId = makeRequest(f"https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/{name}?api_key={API_KEY}")["profileIconId"]
        except:
            iconId = 29
        AddPlayer(cursor, accountId, name, iconId)

    AddTeamPlayer(
        cursor, 
        matchId, 
        accountId, 
        champion, 
        isRedSide, 
        k, d, a, 
        csMin
    )
    print('\t', name, accountId, isRedSide, csMin, k, d, a)

def text(soup):
    return soup.text.strip() 

def addMatch(cursor, html, isEncoded):

    try:
        soup = getSoup(html, isEncoded)
    except:
        raise Exception(f"Invalid HTML, make sure to follow steps correctly.")

    if len(soup.find(id="main").contents) == 0:
        raise Exception("HTML is valid but you have provided the page source without the content loaded, please follow the instructions correctly.")

    matchId = soup.select('.mail-button')[0]['href'].split('%2F')[-2]
    if MatchExists(cursor, matchId):
        raise Exception(f"Match with id '{matchId}' already registered.")

    """
    gameType = text(soup.select('.player-header-queue > div')[0])
    if gameType.lower() != "custom":
        raise Exception(f"Only custom games are allowed, this game is of type '{gameType}'")
    """

    gameLengthStr = text(soup.select('.player-header-duration > div')[0])
    m,s = [int(x) for x in gameLengthStr.strip().split(':')]
    gameLength = timedelta(minutes=m, seconds=s).total_seconds()

    dateStr = text(soup.select('.player-header-date > div')[0])
    date = datetime.strptime(dateStr, "%m/%d/%Y").timestamp()

    redSideWon = None

    for teamContainer in soup.select(".classic.team"):
        isRedSide = f'team-{RED_SIDE}' in teamContainer['class']
        teamWon = text(teamContainer.select('.game-conclusion')[0]) == WIN_STR
        redSideWon = redSideWon or (isRedSide == teamWon)

        for playerContainer in teamContainer.select('li'):
            addPlayer(cursor, playerContainer, matchId, gameLength, isRedSide)

    AddMatch(cursor, matchId, redSideWon, gameLength, date)

    print(gameLength, matchId, redSideWon)