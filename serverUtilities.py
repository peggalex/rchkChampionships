class BadRequestException(Exception):
    pass

def assertGoodRequest(cond: bool, errorMsg: str):
    if not cond:
        raise BadRequestException(errorMsg)