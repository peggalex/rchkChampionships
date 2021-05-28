import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';
import { ITab, Tab } from './Utilities';
import logo from './logo.svg';
import './App.css';
import './tailwindColours.css';
import './Icons.css';
import Players from './Players';

const Matches = (): JSX.Element => <></>;

const MainTab = ({ tab }: { tab: ITab }) =>
	<div className='mainTab'>
		<Tab tab={tab} />
	</div>

const tabs: ITab[] = [
	{ 
		label: "players", 
		route: "/players", 
		component: Players,
		otherPaths: []
	},
	{ 
		label: "matches", 
		route: "/matches", 
		component: Matches,
		otherPaths: ['/matches/:summonerId?', '/matches/:summonerId/champion/:champion']
	}
];

function App() {
	return <>
		<header className="centerAll">
			<h1><span>RCHK</span> Championships</h1>
		</header>
		<section id="mainTabs" className="row center">
			{tabs.map((tab, i) =>
				<MainTab
					tab={tab}
					key={i}
				/>
			)}
		</section>
		<section id="main">
			<Switch>
				{tabs.map((tab, i) => <>{
					[tab.route, ...tab.otherPaths].map((path, j) =>
						<Route path={path} component={tab.component} key={`${i},${j}`}/>
					)
				}</>)}
				<Route path='/' component={() => <Redirect to={tabs[0].route}/>} />
			</Switch>
		</section>
		<footer className="centerAll">
			<p>Copyright © <a href="https://www.linkedin.com/in/alexvilapegg/" target="_blank">Alex Pegg</a> • All Rights Reserved</p>
		</footer>
	</>
}

export default App;
