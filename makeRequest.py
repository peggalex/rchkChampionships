import requests
import time

def makeRequest(query: str, level = 0):
    if 6 < level:
        raise Exception("too many timeouts")

    res = requests.get(query)
    if res.status_code != 200:

        if res.status_code == 429:
            retryAfter = int(res.headers['Retry-After'])
            print(f"retry after {retryAfter} secs")
            time.sleep(retryAfter)
            return makeRequest(query, level + 1)

        elif res.status_code == 404:
            raise Exception("404: url not found")

        else:
            print(f"received error code ({res.status_code}): {level}")
            time.sleep(1)
            return makeRequest(query, level + 1)
    return res.json()