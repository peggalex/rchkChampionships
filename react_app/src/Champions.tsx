import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useHistory, useParams } from 'react-router-dom';
import { GetChampDisplayName, GetChampIconUrl, RestfulType, CallAPI, NumericCompareFunc, CompareNumbers, CompareType, CompareFunc, GetProfileIconUrl } from './Utilities';
import "./Champions.css";
import Icons from './Icons';
import Medals from './Medals';
import { AdditionalStats, CreepScore, IAvg, IChampionAvg, KDAStat, WinRate } from './Players';

const winRateSort = {
    name: 'winrate', 
    sort: NumericCompareFunc((c: IChampion) =>  c.allAvgs.wins / c.allAvgs.noGames),
    desc: true
};

const kdaSort = {
    name: 'kda', 
    sort: NumericCompareFunc((c: IChampion) => 
        (c.allAvgs.avgKills + c.allAvgs.avgAssists) / c.allAvgs.avgDeaths
    ),
    desc: true
};

const gamesPlayedSort = {
    name: 'games played',
    sort: NumericCompareFunc((c: IChampion) => c.allAvgs.noGames),
    desc: true
}

const ChampionSort: {name: string, sort: CompareFunc, desc: boolean}[] = [
    winRateSort,
    {
        name: 'banrate',
        sort: NumericCompareFunc((c: IChampion) => c.allAvgs.banRate),
        desc: true
    },
    gamesPlayedSort,
    {
        name: "wins",
        sort: NumericCompareFunc((c: IChampion) =>  c.allAvgs.wins),
        desc: true
    },
    kdaSort,
    {
        name: "cs",
        sort: NumericCompareFunc((c: IChampion) => c.allAvgs.avgCs),
        desc: true
    },
    {
        name: "kp",
        sort: NumericCompareFunc((c: IChampion) => c.allAvgs.avgKp),
        desc: true
    },
    {
        name: "dmg dealt",
        sort: NumericCompareFunc((c: IChampion) => c.allAvgs.avgDmgDealt),
        desc: true
    },
    {
        name: "dmg taken",
        sort: NumericCompareFunc((c: IChampion) => c.allAvgs.avgDmgTaken),
        desc: true
    },
    {
        name: 'gold', 
        sort: NumericCompareFunc((c: IChampion) => c.allAvgs.avgGold),
        desc: true
    },
    {
        name: 'players',
        sort: NumericCompareFunc((c: IChampion) => c.personAvgs.length),
        desc: true
    },
    {
        name: 'name', 
        sort: (a: IChampion, b: IChampion) => {
            let [aName, bName] = [a.champion, b.champion];

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

export interface IPersonChampionAvg extends IChampionAvg {
    personName: string|null,
    iconId: number
}

interface IChampion {
    champion: string,
    allAvgs: IChampionAvg,
    personAvgs: IPersonChampionAvg[]
}

function Names({championName}: {championName: string, }){
    return <div className="summonerNameContainer">
        <h2>{GetChampDisplayName(championName)}</h2>
    </div>
}

function Champion(
    {champion: {
        champion,
        allAvgs: {
            banRate,
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
        personAvgs
    }}: {champion: IChampion}
): JSX.Element {

    let { championSelected } = useParams() as { championSelected?: string };
    let isSelected = champion == championSelected; // use params will return a string

    const elRef = React.useRef(null as HTMLDivElement|null);

    const [isExpanded, setIsExpanded] = React.useState(isSelected);

    React.useEffect(() => {
        if (isSelected){
            elRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }
    }, []);

    return <div ref={elRef}>
        <div 
            className={`player whiteWhenHovered row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronUp : Icons.ChevronDown}
            </div>
            <img className="profilePic circle" src={GetChampIconUrl(champion)}/>
            <Names championName={champion} />
            <div className="playerRightSide col">
                <div className="mainStats row centerCross">
                    <WinRate wins={wins} games={noGames} isMini={false}/>
                    <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} kp={avgKp} isMini={false}/>
                    <CreepScore cs={avgCs} isMini={false}/>
                </div>
                <AdditionalStats banRate={banRate} kp={avgKp} dmgDealt={avgDmgDealt} dmgTaken={avgDmgTaken} gold={avgGold} isPerMin={true}/>
            </div>
        </div>
        {isExpanded ? <div className="championAvgsContainer accordionShadow">
                {personAvgs.map((p, i) => <PersonChampion 
                    personAvg={p} 
                    key={i}
                />)}
            </div> : null
        }
    </div>
}


function PersonChampion(
    {personAvg: {
        personName,
        iconId,
        banRate,

        avgKills, 
        avgDeaths, 
        avgAssists, 
        avgCs,
        avgKp,
        avgDmgDealt,
        avgDmgTaken,
        avgGold,
        wins,
        noGames,

        doubles,
        triples,
        quadras,
        pentas,
        firstBlood,
        turrets,
        inhibs
    }}:
    {personAvg: IPersonChampionAvg}
): JSX.Element {

    // champion is in pascal case
    const history = useHistory();

    return <div className="champion personChampion row centerCross">
        <div className="playerLeftSide row centerCross">
            <img className="championIcon circle" src={GetProfileIconUrl(iconId)}/>
            <h2 
                onClick={() => history.push(`/people/${personName}`)} 
                className="champName clickable blueTextHover"
            >{personName}</h2>
        </div>
        <div className="playerRightSide col">
            <div className="row centerCross">
                <WinRate wins={wins} games={noGames} isMini={true}/>
                <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} kp={avgKp} isMini={true}/>
                <CreepScore cs={avgCs} isMini={true}/>
            </div>
        </div>
        <AdditionalStats banRate={banRate} kp={avgKp} dmgDealt={avgDmgDealt} dmgTaken={avgDmgTaken} gold={avgGold} isPerMin={true}/>
        <Medals doubles={doubles} triples={triples} quadras={quadras} pentas={pentas} turrets={turrets} inhibs={inhibs} firstBloods={firstBlood}/>
    </div>
}

var CHAMPIONS_ARE_LOADED = false;
var CHAMPIONS: IChampion[] = [];

function Champions(): JSX.Element {

    const [search, setSearch] = React.useState("");

    const [sort, setSort] = React.useState(ChampionSort[0]);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [isLoading, setIsLoading] = React.useState(true);
    const [champions, setChampions] = React.useState([] as IChampion[]);

    function setChampionsSorted(oldChampions: IChampion[]){
        let newChampions = [...oldChampions].sort((a,b) => 
            sort.sort(a,b) || winRateSort.sort(a,b) || gamesPlayedSort.sort(a,b) || kdaSort.sort(a,b)
        );
        if (sort.desc) newChampions.reverse();
        setChampions(newChampions);
    }

    async function getPlayers(){
        if (!CHAMPIONS_ARE_LOADED){
            let res = await CallAPI("/getChampionStats", RestfulType.GET);
            CHAMPIONS = res["res"];
        }
        setIsLoading(false);
        setChampionsSorted(CHAMPIONS);
    }

    React.useEffect(() => {
        setChampionsSorted(CHAMPIONS);
    }, [sort]);

    React.useEffect(() => {
        getPlayers();
    }, []);

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
                        {ChampionSort.map((s, i) => 
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
            {!isLoading ?
                champions
                    .filter(c => GetChampDisplayName(c.champion).toLowerCase().startsWith(search?.toLowerCase()))
                    .map((c, i) => <Champion champion={c} key={i}/>) :
                <div className="loaderContainer"><div className="loader"></div></div>
            }
        </div>
    </div>;
}

export default Champions;
