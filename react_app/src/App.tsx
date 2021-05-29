import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';
import { ITab, Tab } from './Utilities';
import logo from './logo.svg';
import './App.css';
import './tailwindColours.css';
import './Icons.css';
import Players from './Players';
import Matches from './Matches';

const MainTab = ({ tab }: { tab: ITab }) =>
	<div className='mainTab'>
		<Tab tab={tab} />
	</div>

const tabs: ITab[] = [
	{ 
		label: "players", 
		route: "/players", 
		component: Players,
		otherPaths: ['/players/:accountId?']
	},
	{ 
		label: "matches", 
		route: "/matches", 
		component: Matches,
		otherPaths: ['/matches/:summonerId?', '/matches/:summonerId/champion/:champion']
	}
];

const disclaimer = "RCHK Championships was created under Riot Games' \"Legal Jibber Jabber\" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.";
function App() {

	React.useEffect(() => {
		const disclaimerCookie = 'shownDisclaimer';
		if (!document.cookie.split('; ').find(row => row.startsWith(disclaimerCookie))) {
			alert(disclaimer);
			document.cookie = `${disclaimerCookie}=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; Secure`;
		}
	}, [])

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
				{/*tabs.map((tab, i) => <>{
					[tab.route, ...tab.otherPaths].map((path, j) =>
						<Route path={path} component={tab.component} key={`${i},${j}`}/>
					)
				}</>)*/}
				{tabs.map((tab, i) => 
					<Route path={tab.route} component={tab.component} key={i}/>
				)}
				<Route path='/' component={() => <Redirect to={tabs[0].route}/>} />
			</Switch>
		</section>
		<footer className="centerAll">
			<p>Copyright © <a href="https://www.linkedin.com/in/alexvilapegg/" target="_blank">Alex Pegg</a> • All Rights Reserved</p>
		</footer>
	</>
}

export default App;
