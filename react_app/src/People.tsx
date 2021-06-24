import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useHistory, useParams } from 'react-router-dom';
import { GetChampDisplayName, GetChampIconUrl, RestfulType, CallAPI, NumericCompareFunc, CompareNumbers, CompareType, CompareFunc, GetPlayerElementId, GetProfileIconUrl } from './Utilities';
import "./People.css";
import Icons from './Icons';

const winRateSort = {
    name: 'winrate', 
    sort: NumericCompareFunc((p: IPerson) =>  p.allAvgs.wins / p.allAvgs.noGames),
    desc: true
};

const kdaSort = {
    name: 'kda', 
    sort: NumericCompareFunc((p: IPerson) => 
        (p.allAvgs.avgKills + p.allAvgs.avgAssists) / p.allAvgs.avgDeaths
    ),
    desc: true
};

const PlayerSort: {name: string, sort: CompareFunc, desc: boolean}[] = [
    winRateSort,
    kdaSort,
    {
        name: "cs",
        sort: NumericCompareFunc((p: IPerson) => p.allAvgs.avgCs),
        desc: true
    },
    {
        name: "kp",
        sort: NumericCompareFunc((p: IPerson) => p.allAvgs.avgKp),
        desc: true
    },
    {
        name: "dmg dealt",
        sort: NumericCompareFunc((p: IPerson) => p.allAvgs.avgDmgDealt),
        desc: true
    },
    {
        name: "dmg taken",
        sort: NumericCompareFunc((p: IPerson) => p.allAvgs.avgDmgTaken),
        desc: true
    },
    {
        name: 'gold', 
        sort: NumericCompareFunc((p: IPerson) => p.allAvgs.avgGold),
        desc: true
    },
    {
        name: 'name', 
        sort: (a: IPerson, b: IPerson) => {
            let [aName, bName] = [a.summonerName, b.summonerName];

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
        sort: NumericCompareFunc((p: IPerson) => p.championAvgs.length),
        desc: true
    },
    {
        name: 'games played',
        sort: NumericCompareFunc((p: IPerson) => p.allAvgs.noGames),
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

interface IPerson {
    [x: string]: any;
    allAvgs: IAvg,
    person: string,
    iconId: number,
    accounts: {[accountId: number]: string},
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


async function getAvgColorStr(src: string){
    let rgb = await get_average_rgb(src);
    return `rgb(${rgb.join(',')})`;
}

async function get_average_rgb(src: string): Promise<Uint8ClampedArray> {
    /* https://stackoverflow.com/questions/2541481/get-average-color-of-image-via-javascript */
    return new Promise(resolve => {
        let context = document.createElement('canvas').getContext('2d');
        context!.imageSmoothingEnabled = true;

        let img = new Image;
        img.src = src;
        img.crossOrigin = "";

        img.onload = () => {
            context!.drawImage(img, 0, 0, 1, 1);
            resolve(context!.getImageData(0, 0, 1, 1).data.slice(0,3));
        };
    });
}

function PersonIcon({iconId}: {iconId: number}){
    let [personColorStr, setPersonColorStr] = React.useState("white");
    React.useEffect(() => {
        getAvgColorStr(GetProfileIconUrl(iconId)).then(
            (color) => setPersonColorStr(color)
        );
    }, []);
    return <div 
        className="personPic centerAll profilePic circle" 
        style={{backgroundColor: personColorStr}}
    >
        {Icons.User}
    </div>
}

function Names({personName, accounts}: {personName: string, accounts: {[accountId: number]: string}}){
    const history = useHistory();

    return <div className="summonerNameContainer">
        <h2>{personName}</h2>
        <div className="underSummonerName personAccountLink row">{
            Object.entries(accounts).map(([accId, name], i) => 
                <p onClick={()=>history.push(`/players/${accId}`)} className="clickable blueTextHover">{name}</p>            
            )
        }</div>
    </div>
}

function Person(
    {person: {
        iconId, 
        accountId,
        personName,
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
        accounts,
        championAvgs
    }}:
    {person: IPerson}
): JSX.Element {

    let { selectedPersonName } = useParams() as { selectedPersonName?: string };
    let isSelected = personName === selectedPersonName; // use params will return a string

    const elRef = React.useRef(null as HTMLDivElement|null);

    let personElementId = GetPlayerElementId(accountId);

    const [isExpanded, setIsExpanded] = React.useState(isSelected);

    React.useEffect(() => {
        if (isSelected){
            elRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }
    }, []);


    return <div id={personElementId} ref={elRef}>
        <div 
            className={`player whiteWhenHovered row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronUp : Icons.ChevronDown}
            </div>
            <PersonIcon iconId={iconId}/>
            <Names personName={personName} accounts={accounts}/>
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
                {championAvgs.map((c, i) => <PersonChampion 
                    championAvg={c} 
                    accountId={accountId} 
                    key={i}
                />)}
            </div> : null
        }
    </div>
}


function PersonChampion(
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
        </div>
        <AdditionalStats kp={avgKp} dmgDealt={avgDmgDealt} dmgTaken={avgDmgTaken} gold={avgGold} isPerMin={true}/>
    </div>
}

var PLAYERS_ARE_LOADED = false;
var PLAYERS: IPerson[] = [];

function People(): JSX.Element {

    const [search, setSearch] = React.useState("");

    const [sort, setSort] = React.useState(PlayerSort[0]);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [people, setPeople] = React.useState([] as IPerson[]);

    function setPlayersSorted(oldPeople: IPerson[]){
        let newPeople = [...oldPeople].sort((a,b) => 
            sort.sort(a,b) || winRateSort.sort(a,b) || kdaSort.sort(a,b)
        );
        if (sort.desc) newPeople.reverse();
        setPeople(newPeople);
    }

    async function getPlayers(){
        if (!PLAYERS_ARE_LOADED){
            let res = await CallAPI("/getPersonStats", RestfulType.GET);
            PLAYERS = res["res"];
            PLAYERS_ARE_LOADED = true;
        }
        setPlayersSorted(PLAYERS);
    }

    React.useEffect(() => {
        setPlayersSorted(people);
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
            {PLAYERS_ARE_LOADED ?
                people
                    .filter(p => p.summonerName.toLowerCase().startsWith(search?.toLowerCase()))
                    .map((p, i) => <Person person={p} key={i}/>) :
                <div className="loaderContainer"><div className="loader"></div></div>
            }
        </div>
    </div>;
}

export default People;
