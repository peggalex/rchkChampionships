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