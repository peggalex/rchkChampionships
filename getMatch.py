import json
from Schema import *
from SqliteLib import *

def getMatches(cursor, accountId = None, champion = None):

    assert (
        champion is None or accountId is not None, 
        "Champion may only be specified if player is specified."
    )

    whereClause = ""
    if accountId is not None:
        whereClause = f"""
            WHERE '{accountId}' IN (
                SELECT {PLAYER_ACCOUNTID_COL.name} 
                FROM {TEAMPLAYER_TABLE.name} tp
                WHERE tp.{MATCH_MATCHID_COL.name} = m.{MATCH_MATCHID_COL.name}
                    {f"AND tp.{TEAMPLAYER_CHAMPION_COL.name} = '{champion}'" if champion is not None else ""}
            )
        """

    cols = [
        MATCH_DATE_COL, 
        MATCH_REDSIDEWON_COL, 
        PLAYER_SUMMONERNAME_COL,
        TEAMPLAYER_CHAMPION_COL, 
        TEAMPLAYER_ISREDSIDE_COL
    ]

    matches = cursor.FetchAll(f"""
        SELECT m.{MATCH_MATCHID_COL.name},{",".join([c.name for c in cols])}
        FROM {MATCH_TABLE.name} m 
            JOIN {TEAMPLAYER_TABLE.name} tp ON m.{MATCH_MATCHID_COL.name} = tp.{MATCH_MATCHID_COL.name}
            JOIN {PLAYER_TABLE.name} p ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
        {whereClause}
        ORDER BY {MATCH_DATE_COL.name} DESC, {TEAMPLAYER_ISREDSIDE_COL.name}
    """)

    return matches

def getPlayerStats(cursor):

    avgColumns = [TEAMPLAYER_KILLS_COL, TEAMPLAYER_DEATHS_COL, TEAMPLAYER_ASSISTS_COL, TEAMPLAYER_CSMIN_COL]

    colToAvgName = lambda c: f"avg{c.name[0].upper() + c.name[1:]}"
    winsName = "wins"
    countName = "noGames"

    avgPlayerChampStatQuery = f"""
        SELECT 
            p.{PLAYER_ACCOUNTID_COL.name},
            {TEAMPLAYER_CHAMPION_COL.name},
            {PLAYER_SUMMONERNAME_COL.name},
            {PLAYER_ICONID_COL.name},
            SUM(IIF({MATCH_REDSIDEWON_COL.name} = {TEAMPLAYER_ISREDSIDE_COL.name}, 1, 0)) AS {winsName},
            COUNT(*) AS {countName},
            {','.join((f'AVG({c.name}) AS {colToAvgName(c)}' for c in avgColumns))}
        FROM
            {TEAMPLAYER_TABLE.name} tp 
                JOIN {PLAYER_TABLE.name} p ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
                JOIN {MATCH_TABLE.name} m ON tp.{MATCH_MATCHID_COL.name} = m.{MATCH_MATCHID_COL.name}
        GROUP BY p.{PLAYER_ACCOUNTID_COL.name}, {TEAMPLAYER_CHAMPION_COL.name}
        ORDER BY {PLAYER_SUMMONERNAME_COL.name}, COUNT(*) DESC
    """

    avgPlayerChampStats = cursor.FetchAll(avgPlayerChampStatQuery)

    avgPlayerStats = cursor.FetchAll(f"""
        SELECT 
            {PLAYER_SUMMONERNAME_COL.name},
            {PLAYER_ACCOUNTID_COL.name},
            {PLAYER_ICONID_COL.name},
            SUM({winsName}) AS {winsName},
            SUM({countName}) AS {countName},
            {','.join((f'SUM({colToAvgName(c)} * {countName})/SUM({countName}) AS {colToAvgName(c)}' for c in avgColumns))}
        FROM ({avgPlayerChampStatQuery})
        GROUP BY {PLAYER_SUMMONERNAME_COL.name}
        ORDER BY {PLAYER_SUMMONERNAME_COL.name}
    """)

    i=0
    playerStats = []

    for player in avgPlayerStats:

        name = player.pop(PLAYER_SUMMONERNAME_COL.name)
        accountId = player.pop(PLAYER_ACCOUNTID_COL.name)
        iconId = player.pop(PLAYER_ICONID_COL.name)

        champions = []
        playerStats.append({
            "name": name, 
            "accountId": accountId, 
            "iconId": iconId,
            "allAvgs": player, 
            "championAvgs": champions
        })

        while i < len(avgPlayerChampStats):
            champStat = avgPlayerChampStats[i] 
            if champStat[PLAYER_ACCOUNTID_COL.name] == accountId:

                # get rid of fields stored in parent
                champStat.pop(PLAYER_SUMMONERNAME_COL.name)
                champStat.pop(PLAYER_ACCOUNTID_COL.name)
                champStat.pop(PLAYER_ICONID_COL.name)

                champions.append(champStat)
                i+=1
            else:
                break

    assert(i == len(avgPlayerChampStats))
    return playerStats