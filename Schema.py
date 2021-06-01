from SqliteLib import *
from typing import Optional
from datetime import datetime, timedelta

PLAYER_TABLE = DatedTable("player")

PLAYER_ACCOUNTID_COL = PLAYER_TABLE.CreateColumn("accountId", INTEGER_TYPE, isPrimary = True)
PLAYER_SUMMONERNAME_COL = PLAYER_TABLE.CreateColumn("summonerName", VarCharType(30))
PLAYER_ICONID_COL = PLAYER_TABLE.CreateColumn("iconId", INTEGER_TYPE)

def AddPlayer(cursor: SqliteDB, accountId: int, summonerName: str, iconId: int):
    cursor.InsertIntoTable(
        PLAYER_TABLE, {
            PLAYER_ACCOUNTID_COL: [accountId], 
            PLAYER_SUMMONERNAME_COL: [summonerName],
            PLAYER_ICONID_COL: [iconId]
        }
    )

def PlayerExits(cursor: SqliteDB, accountId: int) -> bool:
    return cursor.Exists(cursor.Q(
        [PLAYER_ACCOUNTID_COL], 
        PLAYER_TABLE, 
        {PLAYER_ACCOUNTID_COL: accountId}
    ))

def GetSummonerName(cursor: SqliteDB, accountId: int):
    return cursor.Fetch(cursor.Q(
        [PLAYER_SUMMONERNAME_COL], 
        PLAYER_TABLE, 
        {PLAYER_ACCOUNTID_COL: accountId}
    ))[PLAYER_SUMMONERNAME_COL.name]

def UpdatePlayer(cursor: SqliteDB, accountId: int, summonerName: str, iconId: int):
    cursor.Execute(f"""
        UPDATE {PLAYER_TABLE}
        SET 
            {PLAYER_SUMMONERNAME_COL.name} = {summonerName}, 
            {PLAYER_ICONID_COL.name} = {iconId}
        WHERE {PLAYER_ACCOUNTID_COL.name} = {accountId}
    """)

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
TEAMPLAYER_TABLE.CreateForeignKey(PLAYER_ACCOUNTID_COL, isPrimary = True)
TEAMPLAYER_CHAMPION_COL = TEAMPLAYER_TABLE.CreateColumn("champion", VarCharType(20))
TEAMPLAYER_ISREDSIDE_COL = TEAMPLAYER_TABLE.CreateColumn("isRedSide", BOOL_TYPE)

TEAMPLAYER_KILLS_COL = TEAMPLAYER_TABLE.CreateColumn("kills", INTEGER_TYPE)
TEAMPLAYER_DEATHS_COL = TEAMPLAYER_TABLE.CreateColumn("deaths", INTEGER_TYPE)
TEAMPLAYER_ASSISTS_COL = TEAMPLAYER_TABLE.CreateColumn("assists", INTEGER_TYPE)
TEAMPLAYER_CSMIN_COL = TEAMPLAYER_TABLE.CreateColumn("csMin", FLOAT_TYPE)

def AddTeamPlayer(
    cursor: SqliteDB, 
    matchId: int, 
    accountId: int, 
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
            PLAYER_ACCOUNTID_COL: [accountId],
            TEAMPLAYER_CHAMPION_COL: [champion],
            TEAMPLAYER_ISREDSIDE_COL: [isRedSide],

            TEAMPLAYER_KILLS_COL: [kills],
            TEAMPLAYER_DEATHS_COL: [deaths],
            TEAMPLAYER_ASSISTS_COL: [assists],
            TEAMPLAYER_CSMIN_COL: [csMin]
        }
    )

def GetMostRecentGame(cursor: SqliteDB, accountId: int):
    cursor.Fetch(f"""
        SELECT MAX({MATCH_DATE_COL.name}) AS {MATCH_DATE_COL.name}
        FROM {MATCH_TABLE.name} m JOIN {TEAMPLAYER_TABLE.name} tp
            ON m.{MATCH_MATCHID_COL.name} = tp.{MATCH_MATCHID_COL.name}
        WHERE {PLAYER_ACCOUNTID_COL.name} = {accountId}
    """)[MATCH_DATE_COL.name]

if __name__ == "__main__":
    WriteSchema(
        "schema.sql",
        [PLAYER_TABLE, MATCH_TABLE, TEAMPLAYER_TABLE]
    )