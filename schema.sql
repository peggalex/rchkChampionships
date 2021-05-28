CREATE TABLE IF NOT EXISTS player(
	timestamp INTEGER  NOT NULL,
	accountId INTEGER  NOT NULL,
	summonerName VARCHAR(30)  NOT NULL,
	iconId INTEGER  NOT NULL,
	PRIMARY KEY (accountId)
);

CREATE TABLE IF NOT EXISTS match(
	timestamp INTEGER  NOT NULL,
	matchId INTEGER  NOT NULL,
	redSideWon INTEGER CHECK(redSideWon IN (0, 1)) NOT NULL,
	length INTEGER  NOT NULL,
	date INTEGER  NOT NULL,
	PRIMARY KEY (matchId)
);

CREATE TABLE IF NOT EXISTS teamPlayer(
	timestamp INTEGER  NOT NULL,
	matchId INTEGER  NOT NULL,
	accountId INTEGER  NOT NULL,
	champion VARCHAR(20)  NOT NULL,
	isRedSide INTEGER CHECK(isRedSide IN (0, 1)) NOT NULL,
	kills INTEGER  NOT NULL,
	deaths INTEGER  NOT NULL,
	assists INTEGER  NOT NULL,
	csMin NUMERIC  NOT NULL,
	PRIMARY KEY (matchId, accountId),
	FOREIGN KEY (matchId) REFERENCES match(matchId),
	FOREIGN KEY (accountId) REFERENCES player(accountId)
);