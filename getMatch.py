import json
from Schema import *
from SqliteLib import *
from serverUtilities import assertGoodRequest 

def getMatches(cursor, accountId = None, champion = None):

    assertGoodRequest(
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

    teamPlayers = cursor.FetchAll(f"""
        SELECT 
            m.{MATCH_MATCHID_COL.name},
            p.{PLAYER_ACCOUNTID_COL.name},
            {",".join([c.name for c in cols])}
        FROM {MATCH_TABLE.name} m 
            JOIN {TEAMPLAYER_TABLE.name} tp ON m.{MATCH_MATCHID_COL.name} = tp.{MATCH_MATCHID_COL.name}
            JOIN {PLAYER_TABLE.name} p ON tp.{PLAYER_ACCOUNTID_COL.name} = p.{PLAYER_ACCOUNTID_COL.name}
        {whereClause}
        ORDER BY {MATCH_DATE_COL.name} DESC, m.{MATCH_MATCHID_COL.name} DESC, {TEAMPLAYER_ISREDSIDE_COL.name}
    """)

    matches = []
    for matchOffset in range(0, len(teamPlayers), 10):

        firstPlayer = teamPlayers[matchOffset] # first match player

        match = {
            "matchId": firstPlayer[MATCH_MATCHID_COL.name],
            "date": firstPlayer[MATCH_DATE_COL.name],
            "redSideWon": firstPlayer[MATCH_REDSIDEWON_COL.name],
            "teams": []
        }
        for teamOffset in range(0, 10, 5):
            players = []
            team = {
                "isRedSide": bool(teamOffset//5), 
                "players": players
            }
            for playerOffset in range(5):
                teamPlayer = teamPlayers[matchOffset + teamOffset + playerOffset]

                assert teamPlayer[TEAMPLAYER_ISREDSIDE_COL.name] == team["isRedSide"]
                assert teamPlayer[MATCH_MATCHID_COL.name] == match["matchId"]

                team["players"].append({
                    "champion": teamPlayer[TEAMPLAYER_CHAMPION_COL.name],
                    "accountId": teamPlayer[PLAYER_ACCOUNTID_COL.name],
                    "name": teamPlayer[PLAYER_SUMMONERNAME_COL.name]
                })
            match["teams"].append(team)

        matches.append(match)

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
            SUM(CASE WHEN {MATCH_REDSIDEWON_COL.name} = {TEAMPLAYER_ISREDSIDE_COL.name} THEN 1 ELSE 0 END) AS {winsName},
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