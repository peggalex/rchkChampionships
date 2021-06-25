import React from 'react';
import Icons from './Icons';

function Medal({icon, count, label}: {icon: JSX.Element, count: number, label: string}){
    return <div className="medalContainer row centerCross" title={label}>
        <div className="medalIcon centerAll">{icon}</div>
        <p>{count}</p>
    </div>
}

function Medals({
    doubles,
	triples,
	quadras,
	pentas,
	firstBlood,
	turrets,
	inhibs
}: {
	doubles: number,
	triples: number,
	quadras: number,
	pentas: number,
	firstBlood: boolean,
	turrets: number,
	inhibs: number
}){
    return <div className="medalsContainer row centerCross">{
        [
            {icon: Icons.Penta, count: pentas, label: "Penta kills"},
            {icon: Icons.Quadra, count: quadras, label: "Quadra kills"},
            {icon: Icons.Triple, count: triples, label: "Triple kills"},
            {icon: Icons.Double, count: doubles, label: "Double kills"},
            {icon: Icons.Tower, count: turrets, label: "Towers killed"},
            {icon: Icons.Inhib, count: inhibs, label: "Inhibitors killed"},
            {icon: Icons.FirstBlood, count: firstBlood ? 1 : 0, label: "First blood"},
        ]
        .filter(({count}) => 0 < count)
        .map(({icon, count, label}, i) => <Medal icon={icon} count={count} label={label} key={i}/>)
    }</div>
}

export default Medals;