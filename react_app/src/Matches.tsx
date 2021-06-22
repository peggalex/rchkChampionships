import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useParams, useHistory } from 'react-router-dom';
import { EnumArray, GetChampIconUrl, RestfulType, CallAPI, GetItemIconUrl, GetSpellIconUrl, GetKeystoneIconUrl } from './Utilities';
import "./Matches.css";
import Icons from './Icons';
import Players, { AdditionalStats, KDAStat } from './Players';

interface IPlayer {
    summonerName: string,
    accountId: number,
}

interface IPlayerAggregate extends IPlayer {
    summonerName: string,
    accountId: number,
    champions: string[],
}

interface ITeamPlayer extends IPlayer {
    summonerName: string,
    accountId: number,
    champion: string,
	kills: number,
	deaths: number,
	assists: number,
	cs: number,

	doubles: number,
	triples: number,
	quadras: number,
	pentas: number,

	kp: number,
	dmgDealt: number,
	dmgTaken: number,
	gold: number,

	spell1: string,
	spell2: string,

	item0: number,
	item1: number,
	item2: number,
	item3: number,
	item4: number,
	item5: number,
	item6: number,

	keyStoneUrl: string,

	healing: number,
	vision: number,
	ccTime: number,
	firstBlood: boolean,
	turrets: number,
	inhibs: number
}

interface ITeam {
    isRedSide: boolean,
    kills: number,
    dragons: number,
    barons: number,
    towers: number,
    inhibs: number,
    ban0: string,
    ban1: string,
    ban2: string,
    ban3: string,
    ban4: string
    players: ITeamPlayer[]
};

interface IMatch {
    matchId: number,
    date: number,
    length: number
    redSideWon: boolean,
    redSide: ITeam,
    blueSide: ITeam
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

function Spells({spell1, spell2}: {spell1: string, spell2: string}){
    return <div className="spells col">
        {[spell1, spell2].map((s, i) => <img className="spell" src={GetSpellIconUrl(s)} key={i}/>)}
    </div>
}

function Items({items}: {items: number[]}): JSX.Element {
    return <div className={"items"}>{
        items.map((id, i) => 
            id !== 0 ? 
                <img className="item" src={GetItemIconUrl(id)} key={i} loading="lazy"/> : 
                <span className="item noItem"/>
        )
    }</div>
}

function Match(
    {match: {
        matchId, 
        date, 
        redSideWon, 
        redSide,
        blueSide
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
            {[redSide, blueSide].map((t, i) => <Team team={t} redSideWon={redSideWon} key={i}/>)}
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

function TeamPlayer({player}: {player: ITeamPlayer}): JSX.Element {

    const history = useHistory();
    return <div className="teamPlayer col">
        <div className="row centerCross">
            <Spells spell1={player.spell1} spell2={player.spell2}/>
            <img className="teamPlayerChampionIcon circle" src={GetChampIconUrl(player.champion)}/>
            <img className="keyStone" src={GetKeystoneIconUrl(player.keyStoneUrl)}/>
            <p onClick={()=>history.push(`/players/${player.accountId}`)} className="clickable">{player.summonerName}</p>
            <Items items={Array.from(Array(6)).map((_, i) => (player as any)[`item${i}`])}/>
        </div>
        <div className="row centerCross">
            <KDAStat k={player.kills} d={player.deaths} a={player.assists} isMini={true}/>
            <AdditionalStats kp={player.kp} dmgDealt={player.dmgDealt} dmgTaken={player.dmgTaken} gold={player.gold} isPerMin={false}/>
        </div>
    </div>
}

const MatchContainsPlayerAndChampion = (match: IMatch, accountId?: number, champion?: string):boolean => {    
    return accountId === undefined || [match.redSide, match.blueSide].some(t => 
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
    "setPlayerAndChampionFilter" 
    | "setPlayerFilter" 
    | "togglePlayerFilter" 
    | "setChampionFilter" 
    | "toggleChampionFilter";

type TMatchState = {
    playerFilter: IFilter<IPlayerAggregate>, 
    championFilter: IFilter<string>
};

function getPlayers(matches: IMatch[]): IPlayerAggregate[]{
    let accIdToTeamPlayer = {} as {[index: number]: ITeamPlayer[]};
    for (let m of matches){
        for (let t of [m.redSide, m.blueSide]){
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
            summonerName: players[0].summonerName,
            champions: Array.from(new Set(players.map((p) => p.champion))).sort()
        } as IPlayerAggregate;
    }); // reshape this list of team players into a single player with a list of champions
}

function SortOption({label, onClick, isSelected}: {label: string, onClick: () => void, isSelected: boolean}){
    return <div 
        className={`sortOption clickable row centerCross ${isSelected ? "selected" : "notSelected"}`}
        onClick={onClick}
    >
        <p>{label}</p>
    </div>;
}

var MATCHES_ARE_LOADED = false;
var MATCHES: IMatch[] = [];
var PLAYERS_AGGREGATE: IPlayerAggregate[] = [];

function Matches(): JSX.Element {

    let { accId, champion } = useParams() as { accId?: string, champion?: string};
    let accountId = accId === undefined ? undefined : parseInt(accId); // use params will return a string

    const [state, dispatch] = React.useReducer((state: TMatchState, {type, payload}: {type: MatchActions, payload?: TMatchState}) => {
        switch (type){
            case "setPlayerAndChampionFilter":
                return {
                    playerFilter: {
                        val: payload!.playerFilter.val,
                        expanded: false
                    },
                    championFilter: {
                        val: payload!.championFilter.val,
                        expanded: false
                    }
                };

            case "setPlayerFilter":
                let [oldPlayer, newPlayer] = [state.playerFilter.val, payload!.playerFilter.val];
                
                return oldPlayer?.accountId == newPlayer?.accountId ? state : {
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
                    playerFilter: {
                        ...state.playerFilter,
                        expanded: false
                    },
                    championFilter: {
                        val: payload!.championFilter.val,
                        expanded: false, // close when selected
                    }
                };
                case "toggleChampionFilter":
                    return {
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
        playerFilter: {expanded: false}, 
        championFilter: {expanded: false}
} as TMatchState);

    async function getMatches(){
        if (accountId !== undefined){
            document.querySelector("#main")?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }

        if (!MATCHES_ARE_LOADED){
            let res = await CallAPI("/getMatches", RestfulType.GET);
            MATCHES = res["res"] as IMatch[];
            PLAYERS_AGGREGATE = getPlayers(MATCHES);
            MATCHES_ARE_LOADED = true;
        }

        let selectedPlayer;
        if (accountId !== undefined) {
            for (let player of PLAYERS_AGGREGATE){
                if (player.accountId == accountId){
                    selectedPlayer = player;
                }
            }
        }

        let isValidChampion = champion !== undefined && selectedPlayer?.champions.includes(champion);
        
        dispatch({
            type: "setChampionFilter", 
            payload: {
                ...state, 
                playerFilter: {...state.championFilter, val: selectedPlayer},
                championFilter: {...state.championFilter, val: isValidChampion ? champion : undefined}
            }
        })
    }

    React.useEffect(() => {
        getMatches();
    }, []);

    return <div id="matchesContainer">
        <div id="playerTopBar" className="row centerCross">
            <div className="sortContainer col centerAll">
                <button 
                    className="playerSort clickable" 
                    onClick={() => dispatch({type: "togglePlayerFilter"})}
                >
                    {state.playerFilter.val === undefined ? "any player" : state.playerFilter.val!.summonerName}
                </button>
                {state.playerFilter.expanded ? 
                    <div className="playerSortSelection col">
                        <SortOption label="ANY" onClick={() => dispatch({
                                type: "setPlayerFilter", 
                                payload: {...state, playerFilter: {...state.playerFilter, val: undefined}}
                            })}
                            isSelected={state.playerFilter.val === undefined}
                        />
                        {PLAYERS_AGGREGATE.map((p, i) => 
                            <SortOption label={p.summonerName} onClick={() => dispatch({
                                    type: "setPlayerFilter", 
                                    payload: {...state, playerFilter: {...state.playerFilter, val: p}}
                                })}
                                key={i}
                                isSelected={p.accountId == state.playerFilter.val?.accountId}
                            />
                        )}
                    </div>
                : null}
            </div>
            <div className="sortContainer col centerAll">
                {state.playerFilter.val === undefined ? null : <button 
                    className="playerSort clickable" 
                    onClick={() => dispatch({type: "toggleChampionFilter"})}
                >
                    {state.championFilter.val || "any champion"}
                </button>}
                {state.championFilter.expanded ? 
                    <div className="playerSortSelection col">
                        <SortOption 
                            label="ANY" 
                            onClick={() => dispatch({
                                type: "setChampionFilter", 
                                payload: {...state, championFilter: {...state.championFilter, val: undefined}}
                            })}
                            isSelected={state.championFilter.val === undefined}
                        />
                        {state.playerFilter.val!.champions.map((c, i) => 
                            <SortOption 
                                label={c}
                                onClick={() => dispatch({
                                    type: "setChampionFilter", 
                                    payload: {...state, championFilter: {...state.championFilter, val: c}}
                                })}
                                key={i}
                                isSelected={state.championFilter.val == c}
                            />
                        )}
                    </div>
                : null}
            </div>
            <div className="spacer"></div>
        </div>
        <div className="col center">
            {MATCHES_ARE_LOADED ? MATCHES.map((m: IMatch, i) => 
                MatchContainsPlayerAndChampion(m, state.playerFilter.val?.accountId, state.championFilter.val) ?
                    <Match match={m} key={i}/> : null
            ) : <div className="loaderContainer"><div className="loader"></div></div>}
        </div>
    </div>
}

export default Matches;
