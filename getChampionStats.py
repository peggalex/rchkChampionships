from Schema import *
from SqliteLib import *
from serverUtilities import assertGoodRequest 

def getChampionStats(cursor: SqliteDB):
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

    avgPersonChampStatQuery = f"""
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
        WHERE p.{PERSON_NAME_COL.name} IS NOT NULL
        GROUP BY p.{PERSON_NAME_COL.name}, {TEAMPLAYER_CHAMPION_COL.name}
        ORDER BY 
            {TEAMPLAYER_CHAMPION_COL.name},
            COUNT(*) DESC, 
            {winsQuery} DESC, 
            AVG({TEAMPLAYER_DEATHS_COL.name}) = 0 DESC,
            {kdaQuery} DESC
    """

    avgPersonChampStats = cursor.FetchAll(avgPersonChampStatQuery)

    avgChampStats = cursor.FetchAll(f"""
        SELECT 
            {TEAMPLAYER_CHAMPION_COL.name},
            {','.join((f'SUM({c.name}) AS {c.name}') for c in sumColumns)},
            SUM({winsName}) AS {winsName},
            SUM({countName}) AS {countName},
            {','.join((f'SUM({colToAvgName(c)} * {countName})/SUM({countName}) AS {colToAvgName(c)}' for c in [*avgColumns, *avgColumnsPerMin]))}
        FROM ({avgPersonChampStatQuery})
        GROUP BY {TEAMPLAYER_CHAMPION_COL.name}
        ORDER BY {TEAMPLAYER_CHAMPION_COL.name}
    """)


    i=0
    stats = []

    for avgChampStat in avgChampStats:
        champion = avgChampStat[TEAMPLAYER_CHAMPION_COL.name]
        playerAvgs = []

        banRateName = "banRate"
        noBansQuery = f"SUM(CASE WHEN '{champion}' IN ({','.join((c.name for c in TEAM_BAN_COLS))}) THEN 1 ELSE 0 END)"
        banRateQuery = f"CAST(({noBansQuery} * 2) AS FLOAT)/CAST(COUNT(*) AS FLOAT)"
        # multiply numerator by 2, as we want noBans/games
        # but we have noBans/teams
        # ~ noBans/(games*2) as we have 2 teams per game
        # so we multiply numerator by 2 to cancel out

        banRate = cursor.Fetch(f"""
            SELECT {banRateQuery} AS {banRateName}
            FROM {MATCH_TABLE.name} m JOIN {TEAM_TABLE.name} t
                ON m.{MATCH_MATCHID_COL.name} = t.{MATCH_MATCHID_COL.name}
        """)[banRateName]

        avgChampStat[banRateName] = banRate

        stats.append({
            "champion": champion,
            "allAvgs": avgChampStat, 
            "playerAvgs": playerAvgs
        })

        while i < len(avgChampStats):
            personStat = avgPersonChampStats[i] 
            if personStat[TEAMPLAYER_CHAMPION_COL.name] == champion:
                # get rid of fields stored in parent
                personStat.pop(TEAMPLAYER_CHAMPION_COL.name)

                noBansQuery = f"SUM(CASE WHEN '{champion}' IN ({','.join((c.name for c in TEAM_BAN_COLS))}) THEN 1 ELSE 0 END)"
                banRateQuery = f"CAST({noBansQuery} AS FLOAT)/CAST(COUNT(*) AS FLOAT)"

                banRate = cursor.Fetch(f"""
                    SELECT {banRateQuery} AS {banRateName}
                    FROM (
                        SELECT {MATCH_MATCHID_COL.name}, {TEAMPLAYER_ISREDSIDE_COL.name}
                        FROM {TEAMPLAYER_TABLE.name} tp
                            JOIN {PLAYER_TABLE.name} p 
                                ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
                        WHERE p.{PERSON_NAME_COL.name} = '{personStat[PERSON_NAME_COL.name]}'
                    ) champMatches 
                        JOIN {TEAM_TABLE.name} t
                            ON champMatches.{MATCH_MATCHID_COL.name} = t.{MATCH_MATCHID_COL.name}
                                AND champMatches.{TEAMPLAYER_ISREDSIDE_COL.name} <> t.{TEAMPLAYER_ISREDSIDE_COL.name}
                """)[banRateName]

                personStat[banRateName] = banRate

                playerAvgs.append(personStat)
                i+=1
            else:
                break

    assert i == len(avgChampStats)
    return stats
