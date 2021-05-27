from SqliteLib import *
from typing import Optional

PLAYER_TABLE = DatedTable("player")

PLAYER_SUMMONERID_COL = PLAYER_TABLE.CreateColumn("summonerId", INTEGER_TYPE, isPrimary = True)
PLAYER_SUMMONERNAME_COL = PLAYER_TABLE.CreateColumn("summonerName", VarCharType(30))

def AddPlayer(cursor: SqliteDB, summonerId: int, summonerName: str):
    cursor.InsertIntoTable(
        PLAYER_TABLE, {
            PLAYER_SUMMONERID_COL: [summonerId], 
            PLAYER_SUMMONERNAME_COL: [summonerName]
        }
    )

def PlayerExits(cursor: SqliteDB, summonerId: str) -> bool:
    return cursor.Exists(cursor.Q(
        [PLAYER_SUMMONERID_COL], 
        PLAYER_TABLE, 
        {PLAYER_SUMMONERID_COL: summonerId}
    ))
    

MATCH_TABLE = DatedTable("match")

MATCH_MATCHID_COL = MATCH_TABLE.CreateColumn("matchId", INTEGER_TYPE, isPrimary = True)
MATCH_REDSIDEWON_COL = MATCH_TABLE.CreateColumn("redSideWon", BOOL_TYPE)
MATCH_LENGTH_COL = MATCH_TABLE.CreateColumn("length", INTEGER_TYPE)
MATCH_DATE_COL = MATCH_TABLE.CreateColumn("date", INTEGER_TYPE)

def AddMatch(cursor: SqliteDB, matchId: int, redSideWon: bool, length: int, date: 'unix timestamp'):
    cursor.InsertIntoTable(
        MATCH_TABLE, {
            MATCH_MATCHID_COL: [matchId], 
            MATCH_REDSIDEWON_COL: [redSideWon],
            MATCH_LENGTH_COL: [length],
            MATCH_DATE_COL: [date]
        }
    )

def MatchExists(cursor: SqliteDB, matchId) -> bool:
    return cursor.Exists(cursor.Q(
        [MATCH_MATCHID_COL], 
        MATCH_TABLE, 
        {MATCH_MATCHID_COL: matchId}
    ))


TEAMPLAYER_TABLE = DatedTable("teamPlayer")

TEAMPLAYER_TABLE.CreateForeignKey(MATCH_MATCHID_COL, isPrimary = True)
TEAMPLAYER_TABLE.CreateForeignKey(PLAYER_SUMMONERID_COL, isPrimary = True)
TEAMPLAYER_CHAMPION_COL = TEAMPLAYER_TABLE.CreateColumn("champion", VarCharType(20))
TEAMPLAYER_ISREDSIDE_COL = TEAMPLAYER_TABLE.CreateColumn("isRedSide", BOOL_TYPE)

TEAMPLAYER_KILLS_COL = TEAMPLAYER_TABLE.CreateColumn("kills", INTEGER_TYPE)
TEAMPLAYER_DEATHS_COL = TEAMPLAYER_TABLE.CreateColumn("deaths", INTEGER_TYPE)
TEAMPLAYER_ASSISTS_COL = TEAMPLAYER_TABLE.CreateColumn("assists", INTEGER_TYPE)
TEAMPLAYER_CSMIN_COL = TEAMPLAYER_TABLE.CreateColumn("csMin", FLOAT_TYPE)

def AddTeamPlayer(
    cursor: SqliteDB, 
    matchId: int, 
    summonerId: str, 
    champion: str, 
    isRedSide: bool, 

    kills: int,
    deaths: int,
    assists: int,
    csMin: float
):
    cursor.InsertIntoTable(
        TEAMPLAYER_TABLE, {
            MATCH_MATCHID_COL: [matchId], 
            PLAYER_SUMMONERID_COL: [summonerId],
            TEAMPLAYER_CHAMPION_COL: [champion],
            TEAMPLAYER_ISREDSIDE_COL: [isRedSide],

            TEAMPLAYER_KILLS_COL: [kills],
            TEAMPLAYER_DEATHS_COL: [deaths],
            TEAMPLAYER_ASSISTS_COL: [assists],
            TEAMPLAYER_CSMIN_COL: [csMin]
        }
    )

if __name__ == "__main__":
    WriteSchema(
        "schema.sql",
        [PLAYER_TABLE, MATCH_TABLE, TEAMPLAYER_TABLE]
    )