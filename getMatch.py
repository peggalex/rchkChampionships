from Schema import *
from SqliteLib import *
from serverUtilities import assertGoodRequest 

def getMatches(cursor):

    matches = list(reversed(cursor.FetchAll(cursor.Q(
        [], 
        MATCH_TABLE, 
        orderBys=[MATCH_DATE_COL]
    ))))

    for match in matches:
        matchId = match[MATCH_MATCHID_COL.name]

        for isRedSide in [False, True]:
            team = cursor.FetchAll(cursor.Q([], TEAM_TABLE, {
                MATCH_MATCHID_COL: matchId,
                TEAM_ISREDSIDE_COL: isRedSide
            }))[0]
            team['players'] = cursor.FetchAll(f""" 
                SELECT * 
                FROM {TEAMPLAYER_TABLE.name} tp JOIN {PLAYER_TABLE.name} p
                    ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
                WHERE {MATCH_MATCHID_COL.name} = {matchId}
                    AND {TEAMPLAYER_ISREDSIDE_COL.name} = {isRedSide}
            """)
            team['kills'] = sum(p[TEAMPLAYER_KILLS_COL.name] for p in team['players'])
            match["redSide" if isRedSide else "blueSide"] = team

    return matches

def getPlayerStats(cursor):

    avgColumns = [TEAMPLAYER_KILLS_COL, TEAMPLAYER_DEATHS_COL, TEAMPLAYER_ASSISTS_COL, TEAMPLAYER_KP_COL]
    avgColumnsPerMin = [TEAMPLAYER_CS_COL, TEAMPLAYER_DMGDEALT_COL, TEAMPLAYER_DMGTAKEN_COL, TEAMPLAYER_GOLD_COL]

    colToAvgName = lambda c: f"avg{c.name[0].upper() + c.name[1:]}"

    winsName = "wins"
    countName = "noGames"

    winsQuery = f"SUM(CASE WHEN {MATCH_REDSIDEWON_COL.name} = {TEAMPLAYER_ISREDSIDE_COL.name} THEN 1 ELSE 0 END)"
    kdaQuery = f"(AVG({TEAMPLAYER_KILLS_COL.name}) + AVG({TEAMPLAYER_ASSISTS_COL.name})) / AVG({TEAMPLAYER_DEATHS_COL.name})"

    avgPlayerChampStatQuery = f"""
        SELECT 
            p.{PLAYER_ACCOUNTID_COL.name},
            {TEAMPLAYER_CHAMPION_COL.name},
            {PLAYER_SUMMONERNAME_COL.name},
            {PLAYER_ICONID_COL.name},
            {winsQuery} AS {winsName},
            COUNT(*) AS {countName},
            {','.join((f'AVG({c.name}) AS {colToAvgName(c)}' for c in avgColumns))},
            {','.join((f'AVG(({c.name}*60.0)/{MATCH_LENGTH_COL.name}) AS {colToAvgName(c)}' for c in avgColumnsPerMin))}
        FROM
            {TEAMPLAYER_TABLE.name} tp 
                JOIN {PLAYER_TABLE.name} p ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
                JOIN {MATCH_TABLE.name} m ON tp.{MATCH_MATCHID_COL.name} = m.{MATCH_MATCHID_COL.name}
        GROUP BY p.{PLAYER_ACCOUNTID_COL.name}, {TEAMPLAYER_CHAMPION_COL.name}
        ORDER BY 
            {PLAYER_SUMMONERNAME_COL.name}, 
            COUNT(*) DESC, 
            AVG({TEAMPLAYER_DEATHS_COL.name}) = 0 DESC,
            {winsQuery} DESC, 
            {kdaQuery} DESC
    """

    avgPlayerChampStats = cursor.FetchAll(avgPlayerChampStatQuery)

    avgPlayerStats = cursor.FetchAll(f"""
        SELECT 
            {PLAYER_SUMMONERNAME_COL.name},
            {PLAYER_ACCOUNTID_COL.name},
            {PLAYER_ICONID_COL.name},
            SUM({winsName}) AS {winsName},
            SUM({countName}) AS {countName},
            {','.join((f'SUM({colToAvgName(c)} * {countName})/SUM({countName}) AS {colToAvgName(c)}' for c in [*avgColumns, *avgColumnsPerMin]))}
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

        playerStats.append({
            "name": name, 
            "accountId": accountId, 
            "iconId": iconId,
            "allAvgs": player, 
            "championAvgs": []
        })

        while i < len(avgPlayerChampStats):
            champStat = avgPlayerChampStats[i] 
            if champStat[PLAYER_ACCOUNTID_COL.name] == accountId:

                # get rid of fields stored in parent
                champStat.pop(PLAYER_SUMMONERNAME_COL.name)
                champStat.pop(PLAYER_ACCOUNTID_COL.name)
                champStat.pop(PLAYER_ICONID_COL.name)

                playerStats[-1]["championAvgs"].append(champStat)
                i+=1
            else:
                break

    assert i == len(avgPlayerChampStats)
    return playerStats