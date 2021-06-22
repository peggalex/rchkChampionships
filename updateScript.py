from SqliteLib import SqliteDB
from Schema import *
from addMatch import *
from serverUtilities import assertGoodRequest 

with SqliteDB("database_old.db") as cursorOld, SqliteDB() as cursorNew:
    matches = cursorOld.FetchAll(cursorOld.Q(
        [MATCH_MATCHID_COL],
        MATCH_TABLE
    ))

    for matchId in [m[MATCH_MATCHID_COL.name] for m in matches]:
        teamPlayers = cursorOld.FetchAll(f"""
            SELECT 
                {TEAMPLAYER_CHAMPION_COL.name}, 
                p.{PLAYER_ACCOUNTID_COL.name},
                p.{PLAYER_SUMMONERNAME_COL.name}
            FROM {TEAMPLAYER_TABLE.name} as tp JOIN {PLAYER_TABLE.name} p
                ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
            WHERE {MATCH_MATCHID_COL.name} = {matchId}
        """)

        championToAccIdAndName = {
            tp[TEAMPLAYER_CHAMPION_COL.name]: {
                PLAYER_ACCOUNTID_COL.name: tp[PLAYER_ACCOUNTID_COL.name],
                PLAYER_SUMMONERNAME_COL.name: tp[PLAYER_SUMMONERNAME_COL.name]
            } for tp in teamPlayers
        }

        region = "JP1"

        matchApi = f"https://{region.lower()}.api.riotgames.com/lol/match/v4/matches/{matchId}?api_key={API_KEY}"
        riotRes = makeRequest(matchApi)

        date = riotRes["gameCreation"]
        gameLength = riotRes["gameDuration"]

        redTeam = [t for t in riotRes["teams"] if t["teamId"] == RED_SIDE][0]
        redSideWon = redTeam["win"] == "Win"

        addPlayers(cursorNew, riotRes, championToAccIdAndName)
        addTeam(cursorNew, riotRes)

        AddMatch(cursorNew, matchId, redSideWon, gameLength, date)

        print(gameLength, matchId, redSideWon)

