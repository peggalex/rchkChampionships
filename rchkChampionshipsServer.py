from makeRequest import makeRequest
import traceback
import logging as notFlaskLogging
from datetime import datetime, timedelta
from flask import *
from addMatch import addMatch
from getMatch import getMatches
from getPlayerPersonStats import getPlayerStats, getPersonStats
from getChampionStats import getChampionStats
from setAccountPersonName import setAccountPersonName
from SqliteLib import SqliteDB
import quopri
from serverUtilities import assertGoodRequest, BadRequestException 
import webarchive
import os
import tempfile
import re
from sqlite3 import OperationalError as sqlite3Error

notFlaskLogging.basicConfig(level=notFlaskLogging.DEBUG)
app = Flask(__name__, static_folder='./react_app/build/static', template_folder="./react_app/build")

LEAGUE_VERSION = None
LAST_UPDATED_LEAGUE_VERSION = None
i = 0

def handleException(cursor, e):
    lastQuery = cursor.lastQuery # save before rollback
    cursor.Rollback()
    traceback.print_exc()
    if type(e) == BadRequestException:
        return {"error": f"{str(e)}"}, 400
    else:
        errorMsg = f"Server Error: {str(type(e))} -- {str(e)}"
        if type(e) == sqlite3Error:
            errorMsg += f"\n\tlast query: {lastQuery}"
        return {"error": errorMsg}, 500



@app.route('/addMatchText', methods=['POST'])
def addMatchTextEndpoint():

    with SqliteDB() as cursor:
        try:
            data = request.json

            assertGoodRequest(
                data is not None and "html" in data ,
                "Expecting html field in post data."
            )

            date = addMatch(cursor, data['html'], GetUpdateLeagueVersion)
            return {"date": date}, 200

        except Exception as e:
            return handleException(cursor, e)


@app.route('/addMatchHTML', methods=['POST'])
def addMatchHTMLEndpoint():

    with SqliteDB() as cursor:
        try:
            file = request.files['html']

            assertGoodRequest(
                'html' in request.files and file.filename != '',
                "No File Selected"
            )

            ext = file.filename.split(".")[-1]

            assertGoodRequest(
                ext in ("html", "mht", "mhtml", "webarchive"),
                "Wrong file extension (must be .html, .mht or .webarchive)"
            )

            if ext in ("mht", "mhtml"):
                html = quopri.decodestring(file.read()).decode("latin")

            elif ext == "webarchive":
                webarchive_fd, webarchive_path = tempfile.mkstemp()
                _, decoded_path = tempfile.mkstemp()
                try:
                    with os.fdopen(webarchive_fd, 'wb') as tmp:
                        tmp.write(file.read())
                    webarchive.open(webarchive_path).extract(decoded_path)
                    with open(decoded_path, 'r') as f:
                        html = f.read()
                finally:
                    os.remove(webarchive_path)
                    os.remove(decoded_path)

            else:
                html = file.read().decode("latin")
                
            date = addMatch(cursor, html, GetUpdateLeagueVersion)
            return {"date": date}, 200

        except Exception as e:
            return handleException(cursor, e)


@app.route('/getMatches', methods=['GET'])
def getMatchesEndpoint():

    with SqliteDB() as cursor:
        try:
            return {"res": getMatches(cursor)}, 200
        except Exception as e:
            return handleException(cursor, e)


@app.route('/getPlayerStats', methods=['GET'])
def getPlayerStatsEndpoint():

    with SqliteDB() as cursor:
        try:
            return {"res": getPlayerStats(cursor)}, 200
        except Exception as e:
            return handleException(cursor, e)

@app.route('/getPersonStats', methods=['GET'])
def getPersonStatsEndpoint():

    with SqliteDB() as cursor:
        try:
            return {"res": getPersonStats(cursor)}, 200
        except Exception as e:
            return handleException(cursor, e)
        
@app.route('/getChampionStats', methods=['GET'])
def getChampionStatsEndpoint():

    with SqliteDB() as cursor:
        try:
            return {"res": getChampionStats(cursor)}, 200
        except Exception as e:
            return handleException(cursor, e)


@app.route('/setAccountPersonName/<accountId>/personName/<personName>', methods=['POST'])
def setAccountPersonNameEndpoint(accountId: str, personName: str):

    with SqliteDB() as cursor:
        try:
            assertGoodRequest(re.match("^\d+$", accountId), f"account id '{accountId}' not numeric")
            assertGoodRequest(re.match("^[\dA-Za-z ]+$", personName), f"person name '{personName}'' not alphanumeric with spaces")
            return {"res": setAccountPersonName(cursor, accountId, personName)}, 200
        except Exception as e:
            return handleException(cursor, e)


@app.route('/images/<filename>')
def getImagesEndpoint(filename):

    return send_from_directory(
        os.path.join(app.root_path, 'react_app/build'),
        filename
    )

@app.route('/getLeagueVersion', methods=['GET'])
def getLeagueVersion():
    return {"res": GetUpdateLeagueVersion(force = False)}, 200

@app.route('/')
@app.errorhandler(404)   
def index(e = None):
    return render_template('index.html')

VERSION_ARRAY_URL = "https://ddragon.leagueoflegends.com/api/versions.json"

def GetUpdateLeagueVersion(force: bool = False):
    global LEAGUE_VERSION, LAST_UPDATED_LEAGUE_VERSION, i

    now = datetime.now()
    isOld = (now - (LAST_UPDATED_LEAGUE_VERSION or now)) < timedelta(days=1)
    if (LEAGUE_VERSION == None or force or isOld):

        LEAGUE_VERSION = makeRequest(VERSION_ARRAY_URL)[0]
        LAST_UPDATED_LEAGUE_VERSION = now
        i += 1
        print('iter', i)

    print('version:', LEAGUE_VERSION)
    return LEAGUE_VERSION

if __name__=="__main__":
    print('starting server...')
    app.run(
        "0.0.0.0", 
        debug=True, 
        port=3000
    )
