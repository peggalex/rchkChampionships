import traceback
import logging as notFlaskLogging
from flask import *
from addMatch import addMatch
from getMatch import getMatches, getPlayerStats
from SqliteLib import SqliteDB

notFlaskLogging.basicConfig(level=notFlaskLogging.DEBUG)
app = Flask(__name__, static_folder='./react_app/build/static', template_folder="./react_app/build")

@app.route('/addMatch', methods=['POST'])
def addMatchEndpoint():
    isEncodedKey = 'isEncoded'
    htmlKey = 'html'
    error = None

    data = request.json

    if data is None or not all(x in data for x in [isEncodedKey, htmlKey]):
        error = "Expecting isEncoded and html post data."

    else:

        isEncoded = data[isEncodedKey]
        html = data[htmlKey]

        with SqliteDB() as cursor:
            try:
                assert isEncoded is not None, "isEncoded should be a boolean."
                addMatch(cursor, html, isEncoded)
            except Exception as e:
                error = str(e)
                traceback.print_exc()
                cursor.Rollback()

    return {"error": error}, 200 if error is None else 500

@app.route('/getMatches', methods=['GET'])
@app.route('/getMatches/<summonerId>', methods=['GET'])
@app.route('/getMatches/<summonerId>/champion/<champion>', methods=['GET'])
def getMatchesEndpoint(summonerId = None, champion = None):
    error, res = None, None

    with SqliteDB() as cursor:
        try:
            res = getMatches(cursor, summonerId, champion)
        except Exception as e:
            error = str(e)
            traceback.print_exc()
            cursor.Rollback()

    return {"error": error, "res": res}, 200 if error is None else 500


@app.route('/getPlayerStats', methods=['GET'])
def getPlayerStatsEndpoint():
    error, res = None, None

    with SqliteDB() as cursor:
        try:
            res = getPlayerStats(cursor)
        except Exception as e:
            error = str(e)
            traceback.print_exc()
            cursor.Rollback()

    return {"error": error, "res": res}, 200 if error is None else 500

@app.route('/')
@app.errorhandler(404)   
def index(e = None):
    return render_template('index.html')

if __name__=="__main__":
    print('starting server...')
    app.run("0.0.0.0", debug=True)
