import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useParams } from 'react-router-dom';
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
}

interface IPlayerAggregate extends IPlayer {
    name: string,
    accountId: number,
    champions: string[],
}

interface ITeamPlayer extends IPlayer {
    name: string,
    accountId: number,
    champion: string,
}

interface ITeam {
    isRedSide: boolean,
    players: ITeamPlayer[]
};

interface IMatch {
    matchId: number,
    date: number,
    redSideWon: boolean,
    teams: ITeam[]
};

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

    let region = "JP1";
    let matchLink = `https://matchhistory.na.leagueoflegends.com/en/#match-details/${region}/${matchId}/00000?tab=overview`;

    return <div>
        <div 
            className={`match whiteWhenHovered row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronUp :  Icons.ChevronDown}
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

function TeamPlayer({player: {accountId, champion, name}}: {player: ITeamPlayer}): JSX.Element {
    return <div className="teamPlayer row centerCross">
        <img className="teamPlayerChampionIcon circle" src={GetChampIconUrl(champion)}/>
        <p className="clickable">{name}</p>
    </div>
}

const MatchContainsPlayerAndChampion = (match: IMatch, accountId?: number, champion?: string):boolean => {    
    console.log('matchContains:', accountId, champion);
    return accountId === undefined || match.teams.some(t => 
        t.players.some(p => 
            p.accountId == accountId && (champion === undefined || p.champion == champion)
        )
    );
}

interface IFilter<T> {
    expanded: boolean,
    val?: T
}

type MatchActions = 
    "init" 
    | "setPlayerFilter" 
    | "togglePlayerFilter" 
    | "setChampionFilter" 
    | "toggleChampionFilter";

type TMatchState = {
    matches: IMatch[],
    players: IPlayerAggregate[], 
    playerFilter: IFilter<IPlayerAggregate>, 
    championFilter: IFilter<string>
};

function getPlayers(matches: IMatch[]): IPlayerAggregate[]{
    let accIdToTeamPlayer = {} as {[index: number]: ITeamPlayer[]};
    for (let m of matches){
        for (let t of m.teams){
            for (let p of t.players){
                let existing = accIdToTeamPlayer[p.accountId] || [];
                existing.push(p);
                accIdToTeamPlayer[p.accountId] = existing;
            }
        }
    } // go through each match, grouping players by accountId

    return Object.entries(accIdToTeamPlayer).map(([accId, players]) => {
        return {
            accountId: parseInt(accId), 
            name: players[0].name,
            champions: Array.from(new Set(players.map((p) => p.champion))).sort()
        } as IPlayerAggregate;
    }); // reshape this list of team players into a single player with a list of champions
}

function Matches(): JSX.Element {

    let { accId, champion } = useParams() as { accId?: string, champion?: string};
    let accountId = accId === undefined ? undefined : parseInt(accId); // use params will return a string

    const [state, dispatch] = React.useReducer((state: TMatchState, {type, payload}: {type: MatchActions, payload?: TMatchState}) => {
        switch (type){
            case "init":
                let players = getPlayers(payload!.matches);

                let selectedPlayer;
                if (accountId !== undefined) {
                    for (let player of players){
                        if (player.accountId == accountId){
                            selectedPlayer = player;
                        }
                    }
                }

                let isValidChampion = champion !== undefined && selectedPlayer?.champions.includes(champion);

                return {
                    matches: payload!.matches,
                    players: players,
                    playerFilter: {
                        expanded: false, 
                        val: selectedPlayer
                    }, 
                    championFilter: 
                        {
                            expanded: false,
                            val: isValidChampion ? champion : undefined
                        }
                    };
            case "setPlayerFilter":
                let [oldPlayer, newPlayer] = [state.playerFilter.val, payload!.playerFilter.val];
                
                return oldPlayer?.accountId == newPlayer?.accountId ? state : {
                    ...state,
                    playerFilter: {
                        expanded: false, // close when selected
                        val: newPlayer
                    },
                    championFilter: {
                        expanded: false,
                        val: undefined // change player => champ filter is undefined
                    }
                };
            case "togglePlayerFilter":
                return {
                    ...state,
                    playerFilter: {
                        ...state.playerFilter,
                        expanded: !state.playerFilter.expanded
                    },
                    championFilter: {
                        ...state.championFilter,
                        expanded: false
                    }
                };
            case "setChampionFilter":
                return {
                    ...state,
                    playerFilter: {
                        ...state.playerFilter,
                        expanded: false
                    },
                    championFilter: {
                        expanded: false, // close when selected
                        val: payload!.championFilter.val
                    }
                };
                case "toggleChampionFilter":
                    return {
                        ...state,
                        playerFilter: {
                            ...state.playerFilter,
                            expanded: false,
                        },
                        championFilter: {
                            ...state.championFilter,
                            expanded: !state.championFilter.expanded
                        }
                    };
            default:
                return payload ?? state;
        }
        
    }, {
        matches: [] as IMatch[], 
        players: [] as IPlayerAggregate[], 
        playerFilter: {expanded: false}, 
        championFilter: {expanded: false}
} as TMatchState);

    async function getMatches(){
        let res = await CallAPI("/getMatches", RestfulType.GET);
        dispatch({type: "init", payload: {...state, matches: res["res"] as IMatch[]}});
    }

    React.useEffect(() => {
        getMatches();
    }, []);

    return <div id="playersContainer">
        <div id="playerTopBar" className="row centerCross">
            {<button 
                id="playerSort" 
                className="clickable" 
                onClick={() => dispatch({type: "togglePlayerFilter"})}
            >
                {state.playerFilter.val === undefined ? "any player" : state.playerFilter.val!.name}
            </button>}
            {state.playerFilter.expanded ? 
                <div id="playerSortSelection">
                    <button 
                        onClick={() => dispatch({
                            type: "setPlayerFilter", 
                            payload: {...state, playerFilter: {...state.playerFilter, val: undefined}}
                        })}
                    >ANY</button>
                    {state.players.map((p, i) => 
                        <button 
                            onClick={() =>  dispatch({
                                type: "setPlayerFilter", 
                                payload: {...state, playerFilter: {...state.playerFilter, val: p}}
                            })}
                            key={i}
                        >{p.name}</button>
                    )}
                </div>
            : null}
            {state.playerFilter.val === undefined ? null : <button 
                id="playerSort2" 
                className="clickable" 
                onClick={() => dispatch({type: "toggleChampionFilter"})}
            >
                {state.championFilter.val || "any champion"}
            </button>}
            {state.championFilter.expanded ? 
                <div id="playerSortSelection">
                    <button 
                        onClick={() => dispatch({
                            type: "setChampionFilter", 
                            payload: {...state, championFilter: {...state.championFilter, val: undefined}}
                        })}
                    >ANY</button>
                    {state.playerFilter.val!.champions.map((c, i) => 
                        <button 
                            onClick={() => dispatch({
                                type: "setChampionFilter", 
                                payload: {...state, championFilter: {...state.championFilter, val: c}}
                            })}
                            key={i}
                        >{c}</button>
                    )}
                </div>
            : null}
            <div className="spacer"></div>
        </div>
        <div>
            {state.matches.map((m: IMatch, i) => 
                MatchContainsPlayerAndChampion(m, state.playerFilter.val?.accountId, state.championFilter.val) ?
                    <Match match={m} key={i}/> : null
            )}
        </div>
    </div>
}

export default Matches;
