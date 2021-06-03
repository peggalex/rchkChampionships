import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';
import { GetChampDisplayName, GetChampIconUrl, RestfulType, CallAPI, NumericCompareFunc, CompareNumbers, CompareType, CompareFunc } from './Utilities';
import "./Players.css";
import Icons from './Icons';


const PlayerSort: {name: string, sort: CompareFunc, desc: boolean}[] = [
    {
        name: 'winrate', 
        sort: NumericCompareFunc((p: IPlayer) =>  p.allAvgs.wins / p.allAvgs.noGames),
        desc: true
    },
    {
        name: 'kda', 
        sort: NumericCompareFunc((p: IPlayer) => 
            (p.allAvgs.avgKills + p.allAvgs.avgAssists) / p.allAvgs.avgDeaths
        ),
        desc: true
    },
    {
        name: "cs",
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.avgCsMin),
        desc: true
    },
    {
        name: 'games', 
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.noGames),
        desc: true
    },
    {
        name: 'name', 
        sort: (a: IPlayer, b: IPlayer) => {
            let [aName, bName] = [a.name, b.name];

            let shorterNameLen = Math.min(aName.length, bName.length);
            for (let i = 0; i < shorterNameLen; i++){
                let [aOrd, bOrd] = [aName.charCodeAt(i), bName.charCodeAt(i)];
                let comparison = CompareNumbers(aOrd, bOrd);
                if (comparison != CompareType.same) return comparison;
            }
            return NumericCompareFunc((x: string) => x.length)(aName, bName);
        },
        desc: false
    }
];

interface IAvg {
    avgKills: number,
    avgDeaths: number,
    avgAssists: number,
    avgCsMin: number,
    wins: number,
    noGames: number
}

interface IChampionAvg extends IAvg {
    champion: string
}

interface IPlayer {
    [x: string]: any;
    name: string,
    accountId: number,
    iconId: string,
    allAvgs: IAvg,
    championAvgs: IChampionAvg[]
}

function WinRate({wins, games, isMini}: {wins: number, games: number, isMini: boolean}){
    let losses = games - wins;
    let winRate = (100 * (wins / games)).toFixed(0);

    return <div className={`winRateContainer statContainer ${isMini ? "mini" : "large"}`}>
        <span className="winRateTotal mainStat">
            {winRate}%
        </span>
        <div className="noGames statBreakdown">
            <span className="wins">{wins}</span>
            <span className="losses">{losses}</span>
            <span className="totalGames">{games}</span>
        </div>
    </div>
}

function KDAStat({k, d, a, isMini}: {k: number, d: number, a: number, isMini: boolean}){
    let totalKda = d == 0 ?  "∞" : ((k + a)/d).toFixed(isMini ? 1 : 2);

    return <div className={`kdaContainer statContainer ${isMini ? "mini" : "large"}`}>
        <span className="totalKda mainStat">
            {totalKda}
        </span>
        <div className="kda statBreakdown">
            <span className="kills">{k.toFixed(1)}</span>
            <span className="deaths">{d.toFixed(1)}</span>
            <span className="assists">{a.toFixed(1)}</span>
        </div>
    </div>
}

function CreepScore({csMin, isMini}: {csMin: number, isMini: boolean}){
    return <span className={`csMin mainStat ${isMini ? "mini" : "large"}`}>
        {csMin.toFixed(1)}
    </span>
}

function Player(
    {player: {
        name, 
        iconId, 
        allAvgs: {
            avgKills, 
            avgDeaths, 
            avgAssists, 
            avgCsMin,
            wins,
            noGames
        }, 
        championAvgs
    }}:
    {player: IPlayer}
): JSX.Element {

    const [isExpanded, setIsExpanded] = React.useState(false);

    let iconUrl = `http://ddragon.leagueoflegends.com/cdn/11.11.1/img/profileicon/${iconId}.png`;

    return <div>
        <div 
            className={`player whiteWhenHovered row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronUp : Icons.ChevronDown}
            </div>
            <img className="profilePic circle" src={iconUrl}/>
            <h2>{name}</h2>
            <div className="playerRightSide row centerCross">
                <WinRate wins={wins} games={noGames} isMini={false}/>
                <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} isMini={false}/>
                <CreepScore csMin={avgCsMin} isMini={false}/>
            </div>
        </div>
        {isExpanded ? <div className="championAvgsContainer accordionShadow">
                {championAvgs.map((c, i) => <PlayerChampion championAvg={c} key={i}/>)}
            </div> : null
        }
    </div>
}


function PlayerChampion(
    {championAvg: {
        champion,
        avgKills, 
        avgDeaths, 
        avgAssists, 
        avgCsMin,
        wins,
        noGames
    }}:
    {championAvg: IChampionAvg}
): JSX.Element {

    // champion is in pascal case

    return <div className="champion row centerCross">
        <div className="playerLeftSide row centerCross">
            <img className="championIcon circle" src={GetChampIconUrl(champion)}/>
            <h2 className="champName">{GetChampDisplayName(champion)}</h2>
        </div>
        <div className="playerRightSide row centerCross">
            <WinRate wins={wins} games={noGames} isMini={true}/>
            <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} isMini={true}/>
            <CreepScore csMin={avgCsMin} isMini={true}/>
        </div>
    </div>
}

function Players(): JSX.Element {

    const [search, setSearch] = React.useState("");

    const [sort, setSort] = React.useState(PlayerSort[0]);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [players, setPlayers] = React.useState([] as IPlayer[]);

    function setPlayersSorted(oldPlayers: IPlayer[]){
        let newPlayers = [...oldPlayers].sort(sort.sort);
        if (sort.desc) newPlayers.reverse();
        setPlayers(newPlayers);
    }

    async function getPlayers(){
        let res = await CallAPI("/getPlayerStats", RestfulType.GET);
        setPlayersSorted(res["res"]);
    }

    React.useEffect(() => {
        getPlayers();
    }, []);

    React.useEffect(() => {
        setPlayersSorted(players);
    }, [sort]);

    return <div id="playersContainer">
        <div id="playerTopBar" className="row centerCross">
            <div id="sortContainer" className="col centerAll">
                <div 
                    id="playerSort" 
                    className="clickable row centerCross whiteWhenHovered" 
                    onClick={() => setShowFilterSelection(!showFilterSelection)}
                >
                    <p>{sort.name}</p>
                    <span className="sortIcon">
                        {sort.desc ? Icons.ChevronDown : Icons.ChevronUp}
                    </span>
                </div>
                {showFilterSelection ? 
                    <div id="playerSortSelection" className="col">
                        {PlayerSort.map((s, i) => 
                            <div 
                                className={`sortOption clickable row centerCross ${s.name == sort.name ? "selected" : "notSelected"}`}
                                onClick={() => {
                                    if (s.name == sort.name) s.desc = !sort.desc;
                                    setSort({...s}); 
                                }}
                                key={i}
                            >
                                <p>{s.name}</p>
                                <div className="sortIcon">
                                    {s.desc ? Icons.ChevronDown : Icons.ChevronUp}
                                </div>
                            </div>
                        )}
                    </div>
                : null}
            </div>
            <div className="spacer"></div>
            <input id="playerSearch" onChange={(e)=>setSearch(e.target.value)}/>
        </div>
        <div>
            {
                players
                    .filter(p => p.name.toLowerCase().startsWith(search))
                    .map((p, i) => <Player player={p} key={i}/>)
            }
        </div>
    </div>;
}

export default Players;
