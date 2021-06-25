from Schema import *
from SqliteLib import *
from serverUtilities import assertGoodRequest 

def getStats(cursor: SqliteDB, groupBy: Column):
    #groupBy should be a player attribute

    playerColumns = [PLAYER_ACCOUNTID_COL, PLAYER_SUMMONERNAME_COL, PLAYER_ICONID_COL, PERSON_NAME_COL]
    sumColumns = [TEAMPLAYER_DOULBES_COL, TEAMPLAYER_TRIPLES_COL, TEAMPLAYER_QUADRAS_COL, TEAMPLAYER_PENTAS_COL, TEAMPLAYER_TURRETS_COL, TEAMPLAYER_INHIBS_COL, TEAMPLAYER_FIRSTBLOOD_COL]
    avgColumns = [TEAMPLAYER_KILLS_COL, TEAMPLAYER_DEATHS_COL, TEAMPLAYER_ASSISTS_COL, TEAMPLAYER_KP_COL]
    avgColumnsPerMin = [TEAMPLAYER_CS_COL, TEAMPLAYER_DMGDEALT_COL, TEAMPLAYER_DMGTAKEN_COL, TEAMPLAYER_GOLD_COL]

    colToAvgName = lambda c: f"avg{c.name[0].upper() + c.name[1:]}"

    winsName = "wins"
    countName = "noGames"

    winsQuery = f"SUM(CASE WHEN {MATCH_REDSIDEWON_COL.name} = {TEAMPLAYER_ISREDSIDE_COL.name} THEN 1 ELSE 0 END)"
    kdaQuery = f"(AVG({TEAMPLAYER_KILLS_COL.name}) + AVG({TEAMPLAYER_ASSISTS_COL.name})) / AVG({TEAMPLAYER_DEATHS_COL.name})"

    avgChampStatQuery = f"""
        SELECT 
            {TEAMPLAYER_CHAMPION_COL.name},
            {','.join(f'p.{c.name} AS {c.name}' for c in playerColumns)},
            {winsQuery} AS {winsName},
            COUNT(*) AS {countName},
            {','.join((f'SUM({c.name}) AS {c.name}') for c in sumColumns)},
            {','.join((f'AVG({c.name}) AS {colToAvgName(c)}' for c in avgColumns))},
            {','.join((f'AVG(({c.name}*60.0)/{MATCH_LENGTH_COL.name}) AS {colToAvgName(c)}' for c in avgColumnsPerMin))}
        FROM
            {TEAMPLAYER_TABLE.name} tp 
                JOIN {PLAYER_TABLE.name} p ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
                JOIN {MATCH_TABLE.name} m ON tp.{MATCH_MATCHID_COL.name} = m.{MATCH_MATCHID_COL.name}
        WHERE p.{groupBy.name} IS NOT NULL
        GROUP BY p.{groupBy.name}, {TEAMPLAYER_CHAMPION_COL.name}
        ORDER BY 
            {groupBy.name}, 
            COUNT(*) DESC, 
            AVG({TEAMPLAYER_DEATHS_COL.name}) = 0 DESC,
            {winsQuery} DESC, 
            {kdaQuery} DESC
    """

    avgChampStats = cursor.FetchAll(avgChampStatQuery)

    avgStats = cursor.FetchAll(f"""
        SELECT 
            {','.join(c.name for c in playerColumns)},
            {','.join((f'SUM({c.name}) AS {c.name}') for c in sumColumns)},
            SUM({winsName}) AS {winsName},
            SUM({countName}) AS {countName},
            {','.join((f'SUM({colToAvgName(c)} * {countName})/SUM({countName}) AS {colToAvgName(c)}' for c in [*avgColumns, *avgColumnsPerMin]))}
        FROM ({avgChampStatQuery})
        GROUP BY {groupBy.name}
        ORDER BY {groupBy.name}
    """)

    i=0
    stats = []

    for group in avgStats:
        groupKey = group[groupBy.name]
        championAvgs = []
        accounts = {}

        stats.append({
            **{c.name: group.pop(c.name) for c in playerColumns},
            "allAvgs": group, 
            "championAvgs": championAvgs,
            "accounts": accounts
        })

        while i < len(avgChampStats):
            champStat = avgChampStats[i] 
            if champStat[groupBy.name] == groupKey:
                accounts[champStat[PLAYER_ACCOUNTID_COL.name]] = champStat[PLAYER_SUMMONERNAME_COL.name]
                # get rid of fields stored in parent
                for c in playerColumns:
                    champStat.pop(c.name)

                championAvgs.append(champStat)
                i+=1
            else:
                break

    assert i == len(avgChampStats)
    return stats

def getPlayerStats(cursor):
    return getStats(cursor, PLAYER_ACCOUNTID_COL)

def getPersonStats(cursor):
    return getStats(cursor, PERSON_NAME_COL)