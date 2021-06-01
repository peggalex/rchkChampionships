import traceback
import logging as notFlaskLogging
from flask import *
from addMatch import addMatch
from getMatch import getMatches, getPlayerStats
from SqliteLib import SqliteDB
import quopri
from serverUtilities import assertGoodRequest, BadRequestException 
import webarchive
import os
import tempfile

notFlaskLogging.basicConfig(level=notFlaskLogging.DEBUG)
app = Flask(__name__, static_folder='./react_app/build/static', template_folder="./react_app/build")

def handleException(cursor, e):
    cursor.Rollback()
    traceback.print_exc()
    if type(e) == BadRequestException:
        return {"error": f"{str(e)}"}, 400
    else:
        return {"error": f"Server Error: {str(type(e))} -- {str(e)}"}, 500



@app.route('/addMatchText', methods=['POST'])
def addMatchEndpoint():

    with SqliteDB() as cursor:
        try:
            data = request.json

            assertGoodRequest(
                data is not None and "html" in data ,
                "Expecting html field in post data."
            )

            addMatch(cursor, data['html'])
            return {}, 200

        except Exception as e:
            return handleException(cursor, e)


@app.route('/getMatches', methods=['GET'])
@app.route('/getMatches/<summonerId>', methods=['GET'])
@app.route('/getMatches/<summonerId>/champion/<champion>', methods=['GET'])
def getMatchesEndpoint(summonerId = None, champion = None):

    with SqliteDB() as cursor:
        try:
            return {"res": getMatches(cursor, summonerId, champion)}, 200
        except Exception as e:
            return handleException(cursor, e)


@app.route('/getPlayerStats', methods=['GET'])
def getPlayerStatsEndpoint():

    with SqliteDB() as cursor:
        try:
            return {"res": getPlayerStats(cursor)}, 200
        except Exception as e:
            return handleException(cursor, e)

@app.route('/addMatchHTML', methods=['POST'])
def upload_file():

    with SqliteDB() as cursor:
        try:
            file = request.files['html']

            assertGoodRequest(
                'html' in request.files and file.filename != '',
                "No File Selected"
            )

            ext = file.filename.split(".")[-1]

            assertGoodRequest(
                ext in ["html", "mht", "webarchive"],
                "Wrong file extension (must be .html, .mht or .webarchive)"
            )

            if ext == "mht":
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
                
            addMatch(cursor, html)
            return {}, 200

        except Exception as e:
            return handleException(cursor, e)


@app.route('/images/<filename>')
def favicon(filename):

    return send_from_directory(
        os.path.join(app.root_path, 'react_app/build'),
        filename
    )

@app.route('/')
@app.errorhandler(404)   
def index(e = None):
    return render_template('index.html')

if __name__=="__main__":
    print('starting server...')
    app.run(
        "0.0.0.0", 
        debug=True, 
        port=3000
    )
