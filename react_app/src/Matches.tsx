import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';
import { EnumArray, GetChampIconUrl, RestfulType, CallAPI } from './Utilities';
import "./Matches.css";
import Icons from './Icons';

enum PlayerSort {
    winrate,
    kda,
    games,
    name
}

interface IPlayer {
    name: string,
    accountId: number,
    champion: string,
}

interface ITeam {
    isRedSide: boolean,
    players: IPlayer[]
}

interface IMatch {
    matchId: number,
    date: number,
    redSideWon: boolean,
    teams: ITeam[]
}

function getDaySuffix(day: number){
    if (10 <= day && day < 20) return "th";
    switch(day.toString().slice(-1)){
        case "1": return "st";
        case "2": return "nd";
        case "3": return "rd";
        default: return "th"
    }
}

function Match(
    {match: {
        matchId, 
        date, 
        redSideWon, 
        teams
    }}:
    {match: IMatch}
): JSX.Element {

    let dateObj = new Date(date);
    let time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(dateObj);
    let month = new Intl.DateTimeFormat('en-US', { month: 'long'}).format(dateObj);
    let day = dateObj.getDate();
    let daySuffix = getDaySuffix(day);
    const [isExpanded, setIsExpanded] = React.useState(true);

    let region = "NA1";
    let matchLink = `https://matchhistory.na.leagueoflegends.com/en/#match-details/${region}/${matchId}/00000?tab=overview`;

    return <div>
        <div 
            className={`match row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronDown : Icons.ChevronUp}
            </div>
            <h2 className="matchMonth">{month} {day}{daySuffix}</h2>
            <p className="matchTime">{time}</p>
            <p className="matchYear">{dateObj.getFullYear()}</p>
            <a className="matchHistory centerAll" href={matchLink} target="_blank">{Icons.Link}</a>
        </div>
        {isExpanded ? <div className="teamsContainer row">
            {teams.map((t, i) => <Team team={t} redSideWon={redSideWon} key={i}/>)}
            <div className="teamsShadow accordionShadow"></div>
        </div> : null}
    </div>
}

function Team(
    {team: {
        isRedSide,
        players
    }, 
    redSideWon
}:
    {team: ITeam, redSideWon: boolean}
): JSX.Element {

    let won = redSideWon == isRedSide;
    return <div className={`team spacer ${won ? "won" : "lost"} col`}>
        {players.map((p, i) => <TeamPlayer player={p} key={i}/>)}
    </div>
}

function TeamPlayer({player: {accountId, champion, name}}: {player: IPlayer}): JSX.Element {
    return <div className="teamPlayer row centerCross">
        <img className="teamPlayerChampionIcon circle" src={GetChampIconUrl(champion)}/>
        <p className="clickable">{name}</p>
    </div>
}

function Matches(): JSX.Element {

    const [sort, setSort] = React.useState(PlayerSort.winrate);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);
    const [showAddMatchPopup, setShowAddMatchPopup] = React.useState(false);

    const [matches, setMatches] = React.useState([] as any[]);

    async function getMatches(){
        let res = await CallAPI("/getMatches", RestfulType.GET);
        setMatches(res["res"]);
    }

    React.useEffect(() => {
        getMatches();
    }, []);

    return <div id="playersContainer">
        <div id="playerTopBar" className="row centerCross">
            {/*<button 
                id="playerSort" 
                className="clickable" 
                onClick={() => setShowFilterSelection(!showFilterSelection)}
            >
                {PlayerSort[sort]}
            </button>*/}
            {showFilterSelection ? 
                <div id="playerSortSelection">
                    {EnumArray(PlayerSort).map((s, i) => 
                        <button 
                            onClick={() => setSort((PlayerSort as any)[s])}
                            key={i}
                        >{s}</button>
                    )}
                </div>
            : null}
            <div className="spacer"></div>
            {/*<button
                id="addMatch" 
                className="row centerAll clickable"
                onClick={() => setShowAddMatchPopup(true)}
            >{Icons.Plus}</button>*/}
        </div>
        <div>
            {matches.map((m, i) => <Match match={m} key={i}/>)}
        </div>
    </div>
}

export default Matches;
