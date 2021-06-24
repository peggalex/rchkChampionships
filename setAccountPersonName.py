from SqliteLib import SqliteDB
from Schema import *
from addMatch import *

def setAccountPersonName(cursor: SqliteDB, accountId: str, personName: str):
    AddOrUpdatePersonName(cursor, accountId, personName)