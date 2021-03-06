import React from 'react';
import Icons from './Icons';

function Medal(
        {icon, count, label, isPink = false, isGold = false, isBlue = false}: 
        {icon: JSX.Element, count: number, label: string, isPink?: boolean, isGold?: boolean, isBlue?: boolean}
    ){
    return <div className={`medalContainer row centerCross ${isPink ? "pink" : isGold ? "gold" : isBlue ? "blue" : ""}`} title={`${label} x${count}`}>
        <div className="medalIcon centerAll">{icon}</div>
        <p>{count}</p>
    </div>
}

function Medals({
    doubles=0,
	triples=0,
	quadras=0,
	pentas=0,
	firstBloods=0,
	turrets,
	inhibs,
    dragons=0,
    barons=0
}: {
	doubles?: number,
	triples?: number,
	quadras?: number,
	pentas?: number,
	firstBloods?: number,
	turrets: number,
	inhibs: number,
    dragons?: number,
    barons?: number,
}){
    return <div className="medalsContainer row centerCross">{
        [
            {icon: Icons.Penta, count: pentas, label: "Penta Kills", isPink: true},
            {icon: Icons.Quadra, count: quadras, label: "Quadra Kills", isGold: true},
            {icon: Icons.Triple, count: triples, label: "Triple Kills", isBlue: true},
            {icon: Icons.Double, count: doubles, label: "Double Kills"},
            {icon: Icons.Tower, count: turrets, label: "Towers Killed"},
            {icon: Icons.Inhib, count: inhibs, label: "Inhibitors Killed"},
            {icon: Icons.FirstBlood, count: firstBloods, label: "First Blood"},
            {icon: Icons.Dragon, count: dragons, label: "Dragons"},
            {icon: Icons.Baron, count: barons, label: "Barons"},
        ]
        .filter(({count}) => 0 < count)
        .map(({icon, count, label, isPink = false, isGold = false, isBlue = false}, i) => <Medal icon={icon} count={count} label={label} isPink={isPink} isGold={isGold} isBlue={isBlue} key={i}/>)
    }</div>
}

export default Medals;