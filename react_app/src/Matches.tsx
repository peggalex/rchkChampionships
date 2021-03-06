import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useParams, useHistory } from 'react-router-dom';
import { EnumArray, GetChampIconUrl, RestfulType, CallAPI, GetItemIconUrl, GetSpellIconUrl, GetKeystoneIconUrl, secsToHMS, GetProfileIconUrl, GetChampDisplayName } from './Utilities';
import "./Matches.css";
import Icons from './Icons';
import Players, { AdditionalStats, CreepScore, KDAStat } from './Players';
import Medals from './Medals';

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
    return <div className="items">{
        items.map((id, i) => 
            id !== 0 ? 
                <img className="item" src={GetItemIconUrl(id)} key={i}/> : 
                <span className="item noItem"/>
        )
    }</div>
}

function Match(
    {match: {
        matchId, 
        date, 
        length,
        redSideWon, 
        redSide,
        blueSide
    }}:
    {match: IMatch}
): JSX.Element {

    let index = MATCHES.length - MATCHES.map(m => m.matchId).indexOf(matchId);
    let dateObj = new Date(date);
    let time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(dateObj);
    let month = new Intl.DateTimeFormat('en-US', { month: 'long'}).format(dateObj);
    let day = dateObj.getDate();
    let daySuffix = getDaySuffix(day);
    const [isExpanded, setIsExpanded] = React.useState(false);

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
            <p className="matchIndex">{index}</p>
            <div className='col'>
                <h2 className="matchMonth">{month} {day}{daySuffix}</h2>
                <div className='row'>
                    <p className="matchTime">{time}</p>
                    <p className="matchYear">{dateObj.getFullYear()}</p>
                </div>
            </div>

            <div className="matchMiddle row center">
                {[redSide, blueSide].map((t, i) => <div className={`${t.isRedSide ? 'redSide' : 'blueSide'} teamMiddle row centerCross`} key={i}>
                    <div className={`${t.isRedSide ? 'redSide' : 'blueSide'} medals`}>
                        <Medals turrets={t.towers} inhibs={t.inhibs} dragons={t.dragons} barons={t.barons}/>
                    </div>
                    <h2 className={`teamScore ${t.isRedSide == redSideWon ? 'win' : 'lose'}`}>
                        {t.kills}
                    </h2>
                </div>)}
                <div className="gameLength row centerCross">
                    <div className="clockContainer centerAll">{Icons.Clock}</div>
                    <p>{secsToHMS(length)}</p>
                </div>
                <div className="generalChampIcons row">{[redSide, blueSide].map((t, i) => <div className={`${t.isRedSide ? 'redSide' : 'blueSide'} generalChampIconTeams row`} key={i}>
                    {isExpanded ? 
                        Array.from(Array(5)).map((_, j) => {
                            let champ: string = (t as any)[`ban${j}`];
                            return <div 
                                className="banContainer" 
                                title={`Banned: ${champ === "" ? "None" : GetChampDisplayName(champ)}`} 
                            >
                                <img 
                                    className="generalChampIcon circle" 
                                    src={champ === "" ? GetProfileIconUrl(29) : GetChampIconUrl(champ)}
                                    key={j}
                                />
                                <div className="banIconContainer">{Icons.Ban}</div>
                            </div>
                        }) :
                        t.players.map((p, j) => <img 
                            className="generalChampIcon circle" 
                            src={GetChampIconUrl(p.champion)} 
                            title={GetChampDisplayName(p.champion)}
                            key={j}
                        />)
                    }
                </div>)}</div>
            </div>

            <a className="matchHistory centerAll" href={matchLink} target="_blank">{Icons.Link}</a>
        </div>
        {isExpanded ? <div className="teamsContainer row">
            {[redSide, blueSide].map((t, i) => <Team team={t} redSideWon={redSideWon} gameLength={length} key={i}/>)}
            <div className="teamsShadow accordionShadow"></div>
        </div> : null}
    </div>
}


function Team(
    {team: {
        isRedSide,
        players
    }, 
    redSideWon,
    gameLength
}:
    {team: ITeam, redSideWon: boolean, gameLength: number}
): JSX.Element {

    let won = redSideWon == isRedSide;
    return <div className={`team spacer ${won ? "won" : "lost"} col`}>
        {players.map((p, i) => <TeamPlayer player={p} gameLength={gameLength} key={i}/>)}
    </div>
}

function TeamPlayer({player: p, gameLength}: {player: ITeamPlayer, gameLength: number}): JSX.Element {

    const history = useHistory();
    return <div className="teamPlayer col">
        <div className="row centerCross">
            <Spells spell1={p.spell1} spell2={p.spell2}/>
            <div className="teamPlayerChampionIconContainer circle centerAll">
                <img 
                    className="teamPlayerChampionIcon circle" 
                    title={GetChampDisplayName(p.champion)} 
                    src={GetChampIconUrl(p.champion)}
                />
            </div>
            <img 
                className="keyStone" 
                src={GetKeystoneIconUrl(p.keyStoneUrl)}
            />
            <p onClick={()=>history.push(`/players/${p.accountId}`)} className="clickable blueTextHover">{p.summonerName}</p>
            <div className="teamPlayerRHS col">
                <Items items={Array.from(Array(6)).map((_, i) => (p as any)[`item${i}`])}/>
                <Medals doubles={p.doubles} triples={p.triples} quadras={p.quadras} pentas={p.pentas} firstBloods={p.firstBlood?1:0} turrets={p.turrets} inhibs={p.inhibs}/>
            </div>
        </div>
        <div className="row centerCross">
            <KDAStat k={p.kills} d={p.deaths} a={p.assists} kp={p.kp} isMini={true} isWhole={true}/>
            <CreepScore cs={p.cs} isMini={true} isWhole={true} gameLength={gameLength}/>
            <AdditionalStats kp={p.kp} dmgDealt={p.dmgDealt} dmgTaken={p.dmgTaken} gold={p.gold} isPerMin={false}/>
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
            type: "setPlayerAndChampionFilter", 
            payload: {
                playerFilter: {...state.playerFilter, val: selectedPlayer},
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
                    className="playerSort clickable whiteWhenHovered" 
                    onClick={() => dispatch({type: "togglePlayerFilter"})}
                >
                    {state.playerFilter.val === undefined ? "any player" : state.playerFilter.val!.summonerName}
                </button>
                {state.playerFilter.expanded ? 
                    <div className="playerSortSelection col">
                        <SortOption label="<ANY>" onClick={() => dispatch({
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
                    className="playerSort clickable whiteWhenHovered" 
                    onClick={() => dispatch({type: "toggleChampionFilter"})}
                >
                    {state.championFilter.val || "any champion"}
                </button>}
                {state.championFilter.expanded ? 
                    <div className="playerSortSelection col">
                        <SortOption 
                            label="<ANY>" 
                            onClick={() => dispatch({
                                type: "setChampionFilter", 
                                payload: {...state, championFilter: {...state.championFilter, val: undefined}}
                            })}
                            isSelected={state.championFilter.val === undefined}
                        />
                        {state.playerFilter.val!.champions.map((c, i) => 
                            <SortOption 
                                label={GetChampDisplayName(c)}
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
