import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';
import { EnumArray, GetChampDisplayName, GetChampIconUrl, RestfulType, waitForAjaxCall } from './Utilities';
import "./Players.css";
import Icons from './Icons';

enum PlayerSort {
    winrate,
    kda,
    games,
    name
}

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
    let totalKda = ((k + a)/d).toFixed(isMini ? 1 : 2);

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
            className={`player row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronDown : Icons.ChevronUp}
            </div>
            <img className="profilePic circle" src={iconUrl}/>
            <h2>{name}</h2>
            <div className="playerRightSide row centerCross">
                <WinRate wins={wins} games={noGames} isMini={false}/>
                <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} isMini={false}/>
                <CreepScore csMin={avgCsMin} isMini={false}/>
            </div>
        </div>
        {isExpanded ? <div className="championAvgsContainer">
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
            <h2>{GetChampDisplayName(champion)}</h2>
        </div>
        <div className="playerRightSide row centerCross">
            <WinRate wins={wins} games={noGames} isMini={true}/>
            <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} isMini={true}/>
            <CreepScore csMin={avgCsMin} isMini={true}/>
        </div>
    </div>
}

function Players(): JSX.Element {

    const [sort, setSort] = React.useState(PlayerSort.winrate);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [players, setPlayers] = React.useState([] as any[]);

    async function getPlayers(){
        let res = await waitForAjaxCall("/getPlayerStats", RestfulType.GET);
        console.log(res);
        setPlayers(res["res"]);
    }

    React.useEffect(() => {
        getPlayers();
    }, []);

    return <div id="playersContainer">
        <div id="playerTopBar" className="row centerCross">
            <button 
                id="playerSort" 
                className="clickable" 
                onClick={() => setShowFilterSelection(!showFilterSelection)}
            >
                {PlayerSort[sort]}
            </button>
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
            <input id="playerSearch"/>
        </div>
        <div>
            {players.map((p, i) => <Player player={p} key={i}/>)}
        </div>
    </div>;
}

export default Players;
