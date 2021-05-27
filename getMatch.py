import json
from Schema import *
from SqliteLib import *

def getMatches(cursor, summonerId = None, champion = None):

    assert (
        champion is None or summonerId is not None, 
        "Champion may only be specified if player is specified."
    )

    whereClause = None
    if summonerId is not None:
        whereClause = f"""
            WHERE '{summonerId}' IN (
                SELECT {PLAYER_SUMMONERID_COL.name} 
                FROM {TEAMPLAYER_TABLE.name} tp
                WHERE tp.{MATCH_MATCHID_COL.name} = m.{MATCH_MATCHID_COL.name}
                    {f"AND tp.{TEAMPLAYER_CHAMPION_COL.name} = '{champion}'" if champion is not None else ""}
            )
        """

    matches = cursor.FetchAll(f"""
        SELECT * 
        FROM {MATCH_TABLE.name} m
        {whereClause}
        ORDER BY {MATCH_DATE_COL.name} DESC
    """)

    return matches

def getPlayerStats(cursor):

    avgColumns = [TEAMPLAYER_KILLS_COL, TEAMPLAYER_DEATHS_COL, TEAMPLAYER_ASSISTS_COL, TEAMPLAYER_CSMIN_COL]

    colToAvgName = lambda c: f"avg{c.name.capitalize()}"
    winsName = "wins"
    countName = "games"

    avgPlayerChampStatQuery = f"""
        SELECT 
            p.{PLAYER_SUMMONERID_COL.name},
            {TEAMPLAYER_CHAMPION_COL.name},
            {PLAYER_SUMMONERNAME_COL.name},
            SUM(IIF({MATCH_REDSIDEWON_COL.name} = {TEAMPLAYER_ISREDSIDE_COL.name}, 1, 0)) AS {winsName},
            COUNT(*) AS {countName},
            {','.join((f'AVG({c.name}) AS {colToAvgName(c)}' for c in avgColumns))}
        FROM 
            {TEAMPLAYER_TABLE.name} tp 
                JOIN {PLAYER_TABLE.name} p ON tp.{PLAYER_SUMMONERID_COL.name} = p.{PLAYER_SUMMONERID_COL.name}
                JOIN {MATCH_TABLE.name} m ON tp.{MATCH_MATCHID_COL.name} = m.{MATCH_MATCHID_COL.name}
        GROUP BY p.{PLAYER_SUMMONERID_COL.name}, {TEAMPLAYER_CHAMPION_COL.name}
        ORDER BY {PLAYER_SUMMONERNAME_COL.name}, COUNT(*) DESC
    """

    avgPlayerChampStats = cursor.FetchAll(avgPlayerChampStatQuery)

    avgPlayerStats = cursor.FetchAll(f"""
        SELECT 
            {PLAYER_SUMMONERNAME_COL.name},
            SUM({winsName}) AS {winsName},
            COUNT(*) AS {countName},
            {','.join((f'AVG({colToAvgName(c)}) AS {colToAvgName(c)}' for c in avgColumns))}
        FROM ({avgPlayerChampStatQuery})
        GROUP BY {PLAYER_SUMMONERNAME_COL.name}
        ORDER BY {PLAYER_SUMMONERNAME_COL.name}
    """)

    i=0
    playerStats = {}

    for player in avgPlayerStats:

        name = player.pop(PLAYER_SUMMONERNAME_COL.name)
        champions = []
        playerStats[name] = {"all": player, "champions": champions}

        while i < len(avgPlayerChampStats):
            champStat = avgPlayerChampStats[i] 
            if champStat[PLAYER_SUMMONERNAME_COL.name] == name:

                # get rid of fields stored in parent
                champStat.pop(PLAYER_SUMMONERNAME_COL.name)
                champStat.pop(PLAYER_SUMMONERID_COL.name)

                champions.append(champStat)
                i+=1
            else:
                break

    assert(i == len(avgPlayerChampStats))
    return playerStats