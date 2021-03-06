import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useHistory, useParams } from 'react-router-dom';
import { GetChampDisplayName, GetChampIconUrl, RestfulType, CallAPI, NumericCompareFunc, CompareNumbers, CompareType, CompareFunc, GetProfileIconUrl } from './Utilities';
import "./Players.css";
import Icons from './Icons';
import Medals from './Medals';

const winRateSort = {
    name: 'winrate', 
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

const gamesPlayedSort =  {
    name: 'games played',
    sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.noGames),
    desc: true
}


const PlayerSort: {name: string, sort: CompareFunc, desc: boolean}[] = [
    winRateSort,
    {
        name: "wins",
        sort: NumericCompareFunc((p: IPlayer) =>  p.allAvgs.wins),
        desc: true
    },
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
        name: 'champs played',
        sort: NumericCompareFunc((p: IPlayer) => p.championAvgs.length),
        desc: true
    },
    gamesPlayedSort,
    {
        name: 'name', 
        sort: (a: IPlayer, b: IPlayer) => {
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
    }
];

export interface IAvg {
    avgKills: number,
    avgDeaths: number,
    avgAssists: number,
    avgCs: number,
    avgKp: number,
    avgDmgDealt: number,
    avgDmgTaken: number,
    avgGold: number,
    wins: number,
    noGames: number,

    doubles: number,
    triples: number,
    quadras: number,
    pentas: number,
    firstBlood: number,
    turrets: number,
    inhibs: number
}

export interface IChampionAvg extends IAvg {
    champion: string,
    banRate: number
}

interface IPlayer {
    summonerName: string,
    accountId: number,
    iconId: number,
    allAvgs: IAvg,
    personName: string|null,
    championAvgs: IChampionAvg[]
}

export function WinRate({wins, games, isMini}: {wins: number, games: number, isMini: boolean}){
    let losses = games - wins;
    let winRate = Math.round(100*wins/games);
    let winRateDisplay = winRate.toFixed(0);
    let isPink = 100 == winRate && 3 <= wins;
    let isGold =  90 <= winRate && 2 <= wins;
    let isBlue = 70 <= winRate;

    return <div className={`winRateContainer statContainer ${isMini ? "mini" : "large"}`}>
        <span className={`winRateTotal mainStat ${isPink ? 'pink' : isGold ? 'gold' : isBlue ? 'blue' : ''}`} title={`Winrate: ${winRate}%`}>
            {winRateDisplay}%
        </span>
        <div className="noGames statBreakdown">
            <span className="wins" title={`Wins: ${wins}`}>{wins}</span>
            <span className="losses" title={`Losses: ${losses}`}>{losses}</span>
            <span className="totalGames" title={`Total Games: ${games}`}>{games}</span>
        </div>
    </div>
}


export function KDAStat({k, d, a, kp, isMini, isWhole = false}: {k: number, d: number, a: number, kp: number, isMini: boolean, isWhole?: boolean}){
    let totalKda = d == 0 ?  "??? " : ((k + a)/d).toFixed(isMini ? 1 : 2);
    let formatKDA = (n: number) => n.toFixed(isWhole ? 0 : 1);
    let isPink = (d == 0 && 50 <= kp) || 15 <= (k+a)/d;
    let isGold = 10 <= (k+a)/d;
    let isBlue = 4 <= (k+a)/d;

    return <div className={`kdaContainer statContainer ${isMini ? "mini" : "large"} ${isWhole ? "whole" : "decimal"}`}>
        <span className={`totalKda mainStat ${isPink ? 'pink' : isGold ? 'gold' : isBlue ? 'blue' : ''}`} title={`KDA ratio: ${totalKda}`}>
            {totalKda}
        </span>
        <div className="kda statBreakdown">
            <span className="kills" title={`Kills: ${formatKDA(k)}`}>{formatKDA(k)}</span>
            <span className="deaths" title={`Deaths: ${formatKDA(d)}`}>{formatKDA(d)}</span>
            <span className="assists" title={`Assists: ${formatKDA(a)}`}>{formatKDA(a)}</span>
        </div>
    </div>
}

export function CreepScore({cs, isMini, isWhole = false, gameLength}: {cs: number, isMini: boolean, isWhole?: boolean, gameLength?: number}){
    let formatCs = cs.toFixed(isWhole ? 0 : 1);
    let csMin = isWhole ? 60 / (gameLength ?? -1) * cs : cs;
    let isBlue = 7.5 <= csMin && csMin < 9;
    let isGold = 9 <= csMin;
    let isPink = 10 <= csMin;
    return <span 
        className={`csMin mainStat ${isMini ? "mini" : "large"} ${isWhole ? "whole" : "decimal"} ${isPink ? 'pink' : isGold ? 'gold' : isBlue ? 'blue' : ''}`} 
        title={isWhole ? `Creep Score: ${formatCs} (${csMin.toFixed(1)}/m)` : `Creep Score / min: ${formatCs}`}
    >
        {formatCs}
    </span>
}

export function AdditionalStats({
        banRate,
        kp, 
        dmgDealt, 
        dmgTaken, 
        gold, 
        isPerMin
    }: {
        banRate?: number,
        kp: number,
        dmgDealt: number, 
        dmgTaken: number, 
        gold: number, 
        isPerMin: boolean
    }){

    const formatStat = (n: number) => Math.round(n).toLocaleString("en");

    let data = [
        {
            icon: Icons.KillParticipationIcon,
            value: `${Math.round(kp)}%`,
            label: "Kill Participation",
            isPink: 100 == kp,
            isGold: 90 <= Math.round(kp),
            isBlue: 70 <= Math.round(kp) && Math.round(kp) < 90
        },
        {
            icon: Icons.DmgDealtIcon,
            value: formatStat(dmgDealt),
            label: `Damage Dealt${isPerMin ? ' / min' : ""}`,
        },
        {
            icon: Icons.DmgTakenIcon,
            value: formatStat(dmgTaken),
            label: `Damage Taken${isPerMin ? ' / min' : ""}`
        },
        {
            icon: Icons.GoldIcon,
            value: formatStat(gold),
            label: `Gold${isPerMin ? ' / min' : ""}`
        }
    ];

    if (banRate != null){
        data = [{
            icon: Icons.BanRate,
            value: `${Math.round(banRate*100)}%`,
            label: "Ban Rate (enemy team)",
            isPink: 75 <= Math.round(banRate*100),
            isGold: 50 <= Math.round(banRate*100),
            isBlue: 25 <= Math.round(banRate*100)
        }, ...data];
    }

    return <div className="additionalStats row centerCross spaceAround">
        {data.map((d, i) => <div 
            className={`row centerAll ${(d.isPink ?? false) ? 'pink' : (d.isGold ?? false) ? 'gold' : (d.isBlue ?? false) ? 'blue' : ''}`} 
            title={`${d.label}: ${d.value}`} 
            key={i}
        >
            <div className="additionalStatIcon row centerAll">{d.icon}</div>
            <div>{d.value}</div>
        </div>
        )}
    </div>
}

function EditPersonName({accountId, name, setIsLoading, goBack}: {accountId: number, name: string|null, setIsLoading: (isLoading: boolean) => void, goBack: () => void}){
    const nameRef = React.useRef(null as HTMLInputElement|null);
    const [canSubmit, setCanSubmit] = React.useState(false);
    const [personName, setPersonName] = React.useState(name || "");

    function trySubmitPerson(e: any){
        e.stopPropagation();

        let nameEl = nameRef.current!;
        if (personName === "") {
            nameEl.setCustomValidity("Please enter a name");
            return nameEl.reportValidity();
        } else {
            nameEl.setCustomValidity("");
        }

        if (personName === name){
            return goBack();
        }

        let urlEncodedName = encodeURIComponent(personName);
        setIsLoading(true);
        CallAPI(`/setAccountPersonName/${accountId}/personName/${urlEncodedName}`, RestfulType.POST)
        .then(() => {
            if (window.confirm(`Successfully changed name to '${personName}', reload page?`)){
                window.location.href = `${window.location.origin}${process.env.PUBLIC_URL}/players/${accountId}`;
            }
        }).catch((res)=>{
            console.log("res", res);
            alert(res["error"]);
        }).finally(()=>{
            setIsLoading(false);
        });
    }

    React.useEffect(() => {
        setCanSubmit(personName !== "");
    }, [personName])

    return <div className="editPersonName row centerCross">
        <input 
            pattern="[\dA-Za-z ]{1,16}" 
            maxLength={16}
            ref={nameRef} 
            value={personName} 
            onClick={(e: any) => e.stopPropagation()}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            onChange={() => setPersonName(nameRef.current!.value)}
        />
        <div 
            className={`clickable submitPersonName centerAll ${canSubmit ? "canSubmit" : ""}`} 
            onClick={trySubmitPerson}
        >{Icons.Tick}</div>
    </div>
}

function Names(
    {accountId, summonerName, personName, setIsLoading}: 
    {
        accountId: number, 
        summonerName: string, 
        personName: string|null, 
        setIsLoading: (isLoading: boolean) => void
    }
){
    const history = useHistory();

    const [isEditMode, setIsEditMode] = React.useState(personName == null);
    let goBack = () => setIsEditMode(false);

    return <div className="summonerNameContainer">
        <h2>{summonerName}</h2>
        <div className="underSummonerName">{!isEditMode ?                 
            <div className="personNameDone row centerCross">
                <p 
                    onClick={()=>history.push(`/people/${personName}`)} 
                    className="clickable blueTextHover"
                >{personName}</p>
                <div 
                    onClick={(e) => {e.stopPropagation(); setIsEditMode(true);}} 
                    className="editNameContainer blueTextHover centerAll"
                >{Icons.Edit}</div>
            </div> : <EditPersonName 
                accountId={accountId} 
                name={personName} 
                setIsLoading={setIsLoading} 
                goBack={goBack}
            />
        }</div>
    </div>
}

function Player(
    {player: {
        summonerName, 
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
        personName,
        championAvgs
    }, setIsLoading}:
    {player: IPlayer, setIsLoading: (isLoading: boolean) => void}
): JSX.Element {

    let { accId } = useParams() as { accId?: string };
    let isSelected = accountId.toString() === accId; // use params will return a string

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
            <img className="profilePic circle" src={GetProfileIconUrl(iconId)}/>
            <Names 
                accountId={accountId} 
                summonerName={summonerName} 
                personName={personName} 
                setIsLoading={setIsLoading}
            />
            <div className="playerRightSide col">
                <div className="mainStats row centerCross">
                    <WinRate wins={wins} games={noGames} isMini={false}/>
                    <KDAStat k={avgKills} d={avgDeaths} a={avgAssists} kp={avgKp} isMini={false}/>
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
                className="champName clickable blueTextHover"
            >{GetChampDisplayName(champion)}</h2>
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

var PLAYERS_ARE_LOADED = false;
var PLAYERS: IPlayer[] = [];

function Players(): JSX.Element {

    const [search, setSearch] = React.useState("");

    const [sort, setSort] = React.useState(PlayerSort[0]);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [isLoading, setIsLoading] = React.useState(true);
    const [players, setPlayers] = React.useState([] as IPlayer[]);

    function setPlayersSorted(oldPlayers: IPlayer[]){
        let newPlayers = [...oldPlayers].sort((a,b) => 
            sort.sort(a,b) || winRateSort.sort(a,b) || gamesPlayedSort.sort(a,b) || kdaSort.sort(a,b)
        );
        if (sort.desc) newPlayers.reverse();
        setPlayers(newPlayers);
    }

    async function getPlayers(){
        if (!PLAYERS_ARE_LOADED){
            let res = await CallAPI("/getPlayerStats", RestfulType.GET);
            PLAYERS = res["res"];
        }
        setIsLoading(false);
        setPlayersSorted(PLAYERS);
    }

    React.useEffect(() => {
        setPlayersSorted(players);
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
            {!isLoading ?
                players
                    .filter(p => p.summonerName.toLowerCase().startsWith(search?.toLowerCase()))
                    .map((p, i) => <Player player={p} setIsLoading={setIsLoading} key={i}/>) :
                <div className="loaderContainer"><div className="loader"></div></div>
            }
        </div>
    </div>;
}

export default Players;
