import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';
import './App.css';
import './tailwindColours.css';
import { EnumArray, GetChampIconUrl, RestfulType, waitForAjaxCall } from './Utilities';
import "./Matches.css";
import Icons from './Icons';

export function AddMatch(){

    return <div>
        <p>Custom games are considered private data, and as a result, not available in riot APIs.</p>
        <p>
            To submit a match, 
            please navigate to the game in through 
            <a href="https://matchhistory.na.leagueoflegends.com">matchhistory.na.leagueoflegends.com</a>, 
            and either save and upload the html file, or if you’re technically inclined, paste the html code.
        </p>
        <form encType="multipart/form-data" method="post" action="#">
            <input accept=".html,.mht" type="file"/>
            <button>submit</button>
        </form>
    </div>
}