import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useHistory, useParams } from 'react-router-dom';
import { GetChampDisplayName, GetChampIconUrl, RestfulType, CallAPI, NumericCompareFunc, CompareNumbers, CompareType, CompareFunc, GetPlayerElementId, GetProfileIconUrl } from './Utilities';
import "./Players.css";
import Icons from './Icons';

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
        sort: NumericCompareFunc((p: IPlayer) => p.championAvgs.length),
        desc: true
    },
    {
        name: 'games played',
        sort: NumericCompareFunc((p: IPlayer) => p.allAvgs.noGames),
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
    summonerName: string,
    accountId: number,
    iconId: number,
    allAvgs: IAvg,
    personName: string|null,
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

        setIsLoading(true);
        CallAPI(`/setAccountPersonName/${accountId}/personName/${personName}`, RestfulType.POST)
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
            title="Alphanumeric and spaces (up to 16 characters)" 
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

function Names({accountId, summonerName, personName, setIsLoading}: {accountId: number, summonerName: string, personName: string|null, setIsLoading: (isLoading: boolean) => void}){
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

    let playerElementId = GetPlayerElementId(accountId);

    const [isExpanded, setIsExpanded] = React.useState(isSelected);

    React.useEffect(() => {
        if (isSelected){
            elRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }
    }, []);

    return <div id={playerElementId} ref={elRef}>
        <div 
            className={`player whiteWhenHovered row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronUp : Icons.ChevronDown}
            </div>
            <img className="profilePic circle" src={GetProfileIconUrl(iconId)}/>
            <Names accountId={accountId} summonerName={summonerName} personName={personName} setIsLoading={setIsLoading}/>
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
                className="champName clickable blueTextHover"
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
var PLAYERS: IPlayer[] = [];

function Players(): JSX.Element {

    const [search, setSearch] = React.useState("");

    const [sort, setSort] = React.useState(PlayerSort[0]);
    const [showFilterSelection, setShowFilterSelection] = React.useState(false);

    const [isLoading, setIsLoading] = React.useState(true);
    const [players, setPlayers] = React.useState([] as IPlayer[]);

    function setPlayersSorted(oldPlayers: IPlayer[]){
        let newPlayers = [...oldPlayers].sort((a,b) => 
            sort.sort(a,b) || winRateSort.sort(a,b) || kdaSort.sort(a,b)
        );
        if (sort.desc) newPlayers.reverse();
        setPlayers(newPlayers);
    }

    async function getPlayers(){
        if (!PLAYERS_ARE_LOADED){
            let res = await CallAPI("/getPlayerStats", RestfulType.GET);
            PLAYERS = res["res"];
        }
        console.log('setting isloading to false');
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
