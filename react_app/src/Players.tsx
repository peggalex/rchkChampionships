import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useHistory, useParams } from 'react-router-dom';
import { GetChampDisplayName, GetChampIconUrl, RestfulType, CallAPI, NumericCompareFunc, CompareNumbers, CompareType, CompareFunc, GetPlayerElementId } from './Utilities';
import "./Players.css";
import Icons from './Icons';

const winRateSort = {
    name: 'win rate', 
    sort: NumericCompareFunc((p: IPlayer) =>  p.allAvgs.wins / p.allAvgs.noGames),
    desc: true
};

const kdaSort = {
    name: 'kda', 
    sort: NumericCompareFunc((p: IPlayer) => 
        (p.allAvgs.avgKills + p.allAvgs.avgAssists) / p.allAvgs.avgDeaths
    ),
    desc: true
};

const PlayerSort: {name: string, sort: CompareFunc, desc: boolean}[] = [
    winRateSort,
    kdaSort,
    {
        name: "cs",
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.avgCs),
        desc: true
    },
    {
        name: "kp",
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.avgKp),
        desc: true
    },
    {
        name: "dmg dealt",
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.avgDmgDealt),
        desc: true
    },
    {
        name: "dmg taken",
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.avgDmgTaken),
        desc: true
    },
    {
        name: 'gold', 
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.avgGold),
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
    },
    {
        name: 'champs played',
        sort: NumericCompareFunc((p: IPlayer) => p.championAvgs.length),
        desc: true
    }
];

interface IAvg {
    avgKills: number,
    avgDeaths: number,
    avgAssists: number,
    avgCs: number,
    avgKp: number,
    avgDmgDealt: number,
    avgDmgTaken: number,
    avgGold: number,
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

export function KDAStat({k, d, a, isMini}: {k: number, d: number, a: number, isMini: boolean}){
    let totalKda = d == 0 ?  "∞ " : ((k + a)/d).toFixed(isMini ? 1 : 2);

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

export function CreepScore({cs, isMini}: {cs: number, isMini: boolean}){
    return <span className={`csMin mainStat ${isMini ? "mini" : "large"}`}>
        {cs.toFixed(1)}
    </span>
}

export function AdditionalStats({
            kp, 
            dmgDealt, 
            dmgTaken, 
            gold, 
            isPerMin
        }: {
            kp: number,
            dmgDealt: number, 
            dmgTaken: number, 
            gold: number, 
            isPerMin: boolean
        }){

    let data = [
        {
            icon: Icons.KillParticipationIcon,
            value: `${Math.round(kp)}%`,
            label: "kill participation"
        },
        {
            icon: Icons.DmgDealtIcon,
            value: Math.round(dmgDealt),
            label: `damage dealt${isPerMin ? ' per minute' : ""}`
        },
        {
            icon: Icons.DmgTakenIcon,
            value: Math.round(dmgTaken),
            label: `damage taken${isPerMin ? ' per minute' : ""}`
        },
        {
            icon: Icons.GoldIcon,
            value: Math.round(gold),
            label: `gold${isPerMin ? ' per minute' : ""}`
        }
    ]

    return <div className="additionalStats row centerCross spaceAround">
        {data.map((d, i) => <div className="row centerAll" title={d.label} key={i}>
            <div className="additionalStatIcon row centerAll">{d.icon}</div>
            <div>{d.value}</div>
        </div>
        )}
    </div>
}

function Player(
    {player: {
        name, 
        iconId, 
        accountId,
        allAvgs: {
            avgKills, 
            avgDeaths, 
            avgAssists, 
            avgCs,
            avgKp,
            avgDmgDealt,
            avgDmgTaken,
            avgGold,
            wins,
            noGames
        }, 
        championAvgs
    }}:
    {player: IPlayer}
): JSX.Element {

    let { accId } = useParams() as { accId?: string };
    let isSelected = accountId.toString() === accId; // use params will return a string

    const elRef = React.useRef(null as HTMLDivElement|null);

    let playerElementId = GetPlayerElementId(accountId);

    const [isExpanded, setIsExpanded] = React.useState(isSelected);

    React.useEffect(() => {
        if (isSelected){
            elRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }
    }, []);

    let iconUrl = `http://ddragon.leagueoflegends.com/cdn/11.11.1/img/profileicon/${iconId}.png`;

    return <div id={playerElementId} ref={elRef}>
        <div 
            className={`player whiteWhenHovered row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronUp : Icons.ChevronDown}
            </div>
            <img className="profilePic circle" src={iconUrl}/>
            <h2>{name}</h2>
            <div className="playerRightSide col">
                <div className="mainStats row centerCross">
                    <WinRate wins={wins} games={noGames} isMini={false}/>
                    <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} isMini={false}/>
                    <CreepScore cs={avgCs} isMini={false}/>
                </div>
                <AdditionalStats kp={avgKp} dmgDealt={avgDmgDealt} dmgTaken={avgDmgTaken} gold={avgGold} isPerMin={true}/>
            </div>
        </div>
        {isExpanded ? <div className="championAvgsContainer accordionShadow">
                {championAvgs.map((c, i) => <PlayerChampion 
                    championAvg={c} 
                    accountId={accountId} 
                    key={i}
                />)}
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
        avgCs,
        avgKp,
        avgDmgDealt,
        avgDmgTaken,
        avgGold,
        wins,
        noGames
    }, accountId}:
    {championAvg: IChampionAvg, accountId: number}
): JSX.Element {

    // champion is in pascal case
    const history = useHistory();

    return <div className="champion row centerCross">
        <div className="playerLeftSide row centerCross">
            <img className="championIcon circle" src={GetChampIconUrl(champion)}/>
            <h2 
                onClick={() => history.push(`/matches/${accountId}/champion/${champion}`)} 
                className="champName clickable"
            >{GetChampDisplayName(champion)}</h2>
        </div>
        <div className="playerRightSide col">
            <div className="row centerCross">
                <WinRate wins={wins} games={noGames} isMini={true}/>
                <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} isMini={true}/>
                <CreepScore cs={avgCs} isMini={true}/>
            </div>
            <AdditionalStats kp={avgKp} dmgDealt={avgDmgDealt} dmgTaken={avgDmgTaken} gold={avgGold} isPerMin={true}/>
        </div>
    </div>
}

function Players(): JSX.Element {

    const [search, setSearch] = React.useState("");

    const [sort, setSort] = React.useState(PlayerSort[0]);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [players, setPlayers] = React.useState([] as IPlayer[]);

    function setPlayersSorted(oldPlayers: IPlayer[]){
        let newPlayers = [...oldPlayers].sort((a,b) => 
            sort.sort(a,b) || winRateSort.sort(a,b) || kdaSort.sort(a,b)
        );
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
            <div className="sortContainer col centerAll">
                <div 
                    className="playerSort clickable row centerCross whiteWhenHovered" 
                    onClick={() => setShowFilterSelection(!showFilterSelection)}
                >
                    <p>{sort.name}</p>
                    <span className="sortIcon">
                        {sort.desc ? Icons.ChevronDown : Icons.ChevronUp}
                    </span>
                </div>
                {showFilterSelection ? 
                    <div className="playerSortSelection col">
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
            <div className="row centerCross">
                <div id="playerSearchIcon" className="row centerAll">{Icons.Search}</div>
                <input id="playerSearch" onChange={(e)=>setSearch(e.target.value)} autoComplete='off' spellCheck='false' autoCorrect='off'/>
            </div>
        </div>
        <div>
            {
                players
                    .filter(p => p.name.toLowerCase().startsWith(search?.toLowerCase()))
                    .map((p, i) => <Player player={p} key={i}/>)
            }
        </div>
    </div>;
}

export default Players;
