from SqliteLib import *
from typing import DefaultDict, Optional
from datetime import datetime, timedelta

PERSON_TABLE = DatedTable("person")
PERSON_NAME_COL = PERSON_TABLE.CreateColumn("personName", VarCharType(16))

PLAYER_TABLE = DatedTable("player")

PLAYER_ACCOUNTID_COL = PLAYER_TABLE.CreateColumn("accountId", INTEGER_TYPE, isPrimary = True)
PLAYER_SUMMONERNAME_COL = PLAYER_TABLE.CreateColumn("summonerName", VarCharType(30))
PLAYER_ICONID_COL = PLAYER_TABLE.CreateColumn("iconId", INTEGER_TYPE)
PLAYER_TABLE.CreateForeignKey(PERSON_NAME_COL, isPrimary=False, isNotNull=False)

def AddOrUpdatePersonName(cursor: SqliteDB, accountId: int, personName: str):
    if not cursor.Exists(cursor.Q([], PERSON_TABLE, {PERSON_NAME_COL: personName})):
        cursor.InsertIntoTable(
            PERSON_TABLE, {PERSON_NAME_COL: [personName]}
        )
    cursor.Execute(f"""
        UPDATE {PLAYER_TABLE.name}
        SET {PERSON_NAME_COL.name} = '{personName}'
        WHERE {PLAYER_ACCOUNTID_COL.name} = {accountId}
    """)

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
        UPDATE {PLAYER_TABLE.name}
        SET 
            {PLAYER_SUMMONERNAME_COL.name} = '{summonerName}', 
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

TEAM_TABLE = DatedTable("team")

TEAM_TABLE.CreateForeignKey(MATCH_MATCHID_COL, isPrimary=True)
TEAM_ISREDSIDE_COL = TEAM_TABLE.CreateColumn("isRedSide", BOOL_TYPE, isPrimary=True)
TEAM_DRAGONS_COL = TEAM_TABLE.CreateColumn("dragons", INTEGER_TYPE)
TEAM_BARONS_COL = TEAM_TABLE.CreateColumn("barons", INTEGER_TYPE)
TEAM_TOWERS_COL = TEAM_TABLE.CreateColumn("towers", INTEGER_TYPE)
TEAM_INHIBS_COL = TEAM_TABLE.CreateColumn("inhibs", INTEGER_TYPE)
TEAM_BAN_COLS = [TEAM_TABLE.CreateColumn(f"ban{i}", VarCharType(20)) for i in range(5)]

def AddTeam(
        cursor: SqliteDB, 
        matchId: int, 
        isRedSide: bool, 
        dragons: int,
        barons: int,
        towers: int,
        inhibs: int,
        bans: str
    ):
        cursor.InsertIntoTable(
            TEAM_TABLE, {
                MATCH_MATCHID_COL: [matchId],
                TEAM_ISREDSIDE_COL: [isRedSide],
                TEAM_DRAGONS_COL: [dragons],
                TEAM_BARONS_COL: [barons],
                TEAM_TOWERS_COL: [towers],
                TEAM_INHIBS_COL: [inhibs],
                **{TEAM_BAN_COLS[i]: [bans[i] if i<len(bans) else ""] for i in range(5)}
            }
        )


TEAMPLAYER_TABLE = DatedTable("teamPlayer")

TEAMPLAYER_TABLE.CreateForeignKey(MATCH_MATCHID_COL, isPrimary = True)
TEAMPLAYER_TABLE.CreateForeignKey(PLAYER_ACCOUNTID_COL, isPrimary = True)
TEAMPLAYER_CHAMPION_COL = TEAMPLAYER_TABLE.CreateColumn("champion", VarCharType(20))
TEAMPLAYER_ISREDSIDE_COL = TEAMPLAYER_TABLE.CreateColumn("isRedSide", BOOL_TYPE)

TEAMPLAYER_KILLS_COL = TEAMPLAYER_TABLE.CreateColumn("kills", INTEGER_TYPE)
TEAMPLAYER_DEATHS_COL = TEAMPLAYER_TABLE.CreateColumn("deaths", INTEGER_TYPE)
TEAMPLAYER_ASSISTS_COL = TEAMPLAYER_TABLE.CreateColumn("assists", INTEGER_TYPE)
TEAMPLAYER_CS_COL = TEAMPLAYER_TABLE.CreateColumn("cs", INTEGER_TYPE)

TEAMPLAYER_DOULBES_COL = TEAMPLAYER_TABLE.CreateColumn("doubles", INTEGER_TYPE)
TEAMPLAYER_TRIPLES_COL = TEAMPLAYER_TABLE.CreateColumn("triples", INTEGER_TYPE)
TEAMPLAYER_QUADRAS_COL = TEAMPLAYER_TABLE.CreateColumn("quadras", INTEGER_TYPE)
TEAMPLAYER_PENTAS_COL = TEAMPLAYER_TABLE.CreateColumn("pentas", INTEGER_TYPE)

TEAMPLAYER_KP_COL = TEAMPLAYER_TABLE.CreateColumn("kp", INTEGER_TYPE)
TEAMPLAYER_DMGDEALT_COL = TEAMPLAYER_TABLE.CreateColumn("dmgDealt", INTEGER_TYPE)
TEAMPLAYER_DMGTAKEN_COL = TEAMPLAYER_TABLE.CreateColumn("dmgTaken", INTEGER_TYPE)
TEAMPLAYER_GOLD_COL = TEAMPLAYER_TABLE.CreateColumn("gold", INTEGER_TYPE)

TEAMPLAYER_SPELL1_COL = TEAMPLAYER_TABLE.CreateColumn("spell1", VarCharType(30))
TEAMPLAYER_SPELL2_COL = TEAMPLAYER_TABLE.CreateColumn("spell2", VarCharType(30))

TEAMPLAYER_ITEM_COLS = [TEAMPLAYER_TABLE.CreateColumn(f"item{i}", INTEGER_TYPE) for i in range(7)]

TEAMPLAYER_KEYSTONEURL_COL = TEAMPLAYER_TABLE.CreateColumn("keyStoneUrl", VarCharType(100))

TEAMPLAYER_HEALING_COL = TEAMPLAYER_TABLE.CreateColumn("healing", INTEGER_TYPE)
TEAMPLAYER_VISION_COL = TEAMPLAYER_TABLE.CreateColumn("vision", INTEGER_TYPE)
TEAMPLAYER_CCTIME_COL = TEAMPLAYER_TABLE.CreateColumn("ccTime", INTEGER_TYPE)
TEAMPLAYER_FIRSTBLOOD_COL = TEAMPLAYER_TABLE.CreateColumn("firstBlood", BOOL_TYPE)
TEAMPLAYER_TURRETS_COL = TEAMPLAYER_TABLE.CreateColumn("turrets", INTEGER_TYPE)
TEAMPLAYER_INHIBS_COL = TEAMPLAYER_TABLE.CreateColumn("inhibs", INTEGER_TYPE)


def AddTeamPlayer(
    cursor: SqliteDB, 
    matchId: int, 
    accountId: int, 
    champion: str, 
    isRedSide: bool, 

    kills: int,
    deaths: int,
    assists: int,
    cs: int,

    doubles: int,
    triples: int,
    quadras: int,
    pentas: int,

    kp: int, # this is technically redundant, but it's easier for querying
    dmgDealt: int,
    dmgTaken: int,
    gold: int,

    spell1: int,
    spell2: int,

    keyStoneUrl: str,

    healing: int,
    vision: int,
    ccTime: int,
    firstBlood: int,
    turrets: int,
    inhibs: int,

    items: int
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
            TEAMPLAYER_CS_COL: [cs],

            TEAMPLAYER_DOULBES_COL: [doubles],
            TEAMPLAYER_TRIPLES_COL: [triples],
            TEAMPLAYER_QUADRAS_COL: [quadras],
            TEAMPLAYER_PENTAS_COL: [pentas],

            TEAMPLAYER_KP_COL: [kp],
            TEAMPLAYER_DMGDEALT_COL: [dmgDealt],
            TEAMPLAYER_DMGTAKEN_COL: [dmgTaken],
            TEAMPLAYER_GOLD_COL: [gold],

            TEAMPLAYER_SPELL1_COL: [spell1],
            TEAMPLAYER_SPELL2_COL: [spell2],

            **{TEAMPLAYER_ITEM_COLS[i]:[items[i]] for i in range(7)},

            TEAMPLAYER_KEYSTONEURL_COL: [keyStoneUrl],

            TEAMPLAYER_HEALING_COL: [healing],
            TEAMPLAYER_VISION_COL: [vision],
            TEAMPLAYER_CCTIME_COL: [ccTime],
            TEAMPLAYER_FIRSTBLOOD_COL: [firstBlood],
            TEAMPLAYER_TURRETS_COL: [turrets],
            TEAMPLAYER_INHIBS_COL: [inhibs],
        }
    )

def GetMostRecentGame(cursor: SqliteDB, accountId: int):
    return cursor.Fetch(f"""
        SELECT MAX({MATCH_DATE_COL.name}) AS {MATCH_DATE_COL.name}
        FROM {MATCH_TABLE.name} m JOIN {TEAMPLAYER_TABLE.name} tp
            ON m.{MATCH_MATCHID_COL.name} = tp.{MATCH_MATCHID_COL.name}
        WHERE {PLAYER_ACCOUNTID_COL.name} = {accountId}
    """)[MATCH_DATE_COL.name]

if __name__ == "__main__":
    WriteSchema(
        "schema.sql",
        [PERSON_TABLE, PLAYER_TABLE, MATCH_TABLE, TEAM_TABLE, TEAMPLAYER_TABLE]
    )