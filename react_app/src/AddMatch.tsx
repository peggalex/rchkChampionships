import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useLocation } from 'react-router-dom';
import { EnumArray, GetChampIconUrl, RestfulType, CallAPI as CallAPI, CallAPIJson } from './Utilities';
import "./AddMatch.css";
import Icons from './Icons';

function HelpAccordion({title, component}: {title: string, component: JSX.Element}): JSX.Element {

    const [isExpanded, setIsExpanded] = React.useState(false);

    return <div className="helpContainer">
        <div 
            className={`helpTitle row centerCross clickable ${isExpanded ? "expanded" : ""}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {Icons.Help}
            <h2>{title}</h2>
            <div className="collapseIcon">
                {isExpanded ? Icons.ChevronDown : Icons.ChevronUp}
            </div>
        </div>
        <div className="helpBody accordionShadow col">
            {isExpanded ? component : null}
        </div>
    </div>
}

function FileUpload(): JSX.Element{
    const fileRef = React.useRef(null as HTMLInputElement|null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [fileName, setFileName] = React.useState("");

    function onFileChange(){
        let fileElement = fileRef.current;
        if (fileElement == null){
            return;
        }
        let files = fileElement.files;

        if (files != null && 0 < files.length) {
            setFileName(files[0].name);      
        }
    }

    async function sendFile(){
        let fileElement = fileRef.current;
        if (fileElement == null){
            return;
        }
        let files = fileElement.files;

        if (files == null || files.length == 0) {
            fileElement.setCustomValidity("Please select file");
            return fileElement.reportValidity();
        } else {
            fileElement.setCustomValidity("");
        }
        let file = files[0];        
        
        var data = new FormData();
        data.append('html', file);
        
        setIsLoading(true);
        CallAPI("/addMatchHTML", RestfulType.POST, data)
        .then(() => {
            if (window.confirm("Added match, reload page?")){
                window.location.href = "./matches";
            }
        }).catch((res)=>{
            console.log("res", res);
            alert(res["error"]);
        }).finally(()=>{
            setIsLoading(false);
        });
    }

    return isLoading ? <div className="loader"></div> : <>
        <HelpAccordion title="Help saving html" component={<>
            <ol>
                <li>
                    {"Chrome: right click page > Save as... > Web page, Single File"}
                </li>   
                <li>
                    {"Firefox: right click page > Save Page As... > Web page, Complete"}
                </li>
                <li>
                    {"Safari: right click page > Save Page As... > Web Archive"}
                </li>
            </ol>
        </>}/>
        <label id="htmlUploadContainer">
            <input 
                onChange={onFileChange} 
                ref={fileRef} 
                name="file" 
                accept=".html,.mht,.webarchive" 
                type="file"
            />
            <div id="htmlUpload" className="col centerCross clickable">
                <div className="row centerCross">
                    {Icons.Upload} 
                    <p>choose file</p>
                </div>
                <p>(.html, .mht, .webarchive)</p>
            </div>
        </label>
        <p><i>{fileName == "" ? "No file selected" : fileName}</i></p>
        <div id="addMatchBtnContainer">
            <button 
                id="addMatchBtn"
                className="row centerAll clickable" 
                onClick={sendFile}
                disabled={fileName == ""}
                title={fileName == "" ? "Upload a file first" : ""}
            >{Icons.Plus}</button>
        </div>
    </>
}

function TextUpload(): JSX.Element{
    const textAreaRef = React.useRef(null as HTMLTextAreaElement|null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [canAdd, setCanAdd] = React.useState(false);

    function onChange(){
        let textAreaElement = textAreaRef.current;
        if (textAreaElement == null){
            return;
        }
        let html = textAreaElement.value;
        if (html != "") {
            setCanAdd(true);    
        }
    }

    async function sendFile(){
        let textAreaElement = textAreaRef.current;
        if (textAreaElement == null){
            return;
        }
        let html = textAreaElement.value;
        if (html == "") {
            textAreaElement.setCustomValidity("Please select file");
            return textAreaElement.reportValidity();
        } else {
            textAreaElement.setCustomValidity("");
        }
        
        setIsLoading(true);
        CallAPIJson("/addMatchText", RestfulType.POST, {'html': html})
        .then(() => {
            if (window.confirm("Added match, reload page?")){
                window.location.href = "./matches";
            }
        })
        .catch((res)=> alert(res["error"]))
        .finally(()=> setIsLoading(false));
    }

    return isLoading ? <div className="loader"></div> : <>
        <HelpAccordion title="Help pasting html" component={<>
            <ol>
                <li>
                    {"Chrome: right click page > Inspect > right click html tag > Copy > Copy outerHTML"}
                </li>   
                <li>
                    {"Firefox: right click page > Inspect > right click html tag > Copy > Outer Html"}
                </li>
                <li>
                    {"Safari: right click page > Inspect Element > right click html tag > Copy > HTML"}
                </li>
            </ol>
        </>}/>
        <div id="textUploadContainer" className="col">
            <textarea 
                onChange={onChange} 
                ref={textAreaRef} 
                id="htmlText"
                spellCheck={false}
                placeholder="<html>...</html>"
            />
            <div id="addMatchBtnContainer">
                <button 
                    id="addMatchBtn"
                    className="row centerAll clickable" 
                    onClick={sendFile}
                    disabled={!canAdd}
                    title={canAdd ? "" : "Upload a file first"}
                >{Icons.Plus}</button>
            </div>
        </div>
    </>
}

const tabs: {name: string, caption: string, component: JSX.Element}[] = [
    {name: "upload", caption: "simpler", component: <FileUpload/>},
    {name: "paste", caption: "faster", component: <TextUpload/>}
]

function AddMatch(): JSX.Element{

    const [tab, setTab] = React.useState(tabs[0]);

    return <div id="addMatch" className="col centerCross">
        <div id="generalInfo">
            <p>Custom games are considered private data, and as a result, are not available in public riot APIs.</p>
            <p>
                To submit a match, please navigate to the game 
                at <a href="https://matchhistory.na.leagueoflegends.com">matchhistory.na.leagueoflegends.com</a>, 
                and either save and upload the html file, or if you’re technically inclined, paste the html code.
            </p>
        </div>
        <HelpAccordion title="Help navigating to the match page" component={<ol>
            <li>
                Log in to <a href="https://matchhistory.na.leagueoflegends.com">matchhistory.na.leagueoflegends.com</a>
            </li>
            <li>
                <span>Select the game you wish to upload, navigating to a url that looks like:</span>
                <br/>
                <span className="urlExample">
                    https://matchhistory.na.leagueoflegends.com/en/#match-details/JP1/
                    <span>{"<matchId>"}</span>
                    {"/"}
                    <span>{"<summonerId>"}</span>
                </span>
            </li>
        </ol>}/>
        <div id="addMatchTabContainer" className="row center">
            {
                tabs.map((t, i) => <div 
                    className={`addMatchTab clickable ${tab == t ? 'selected' : 'notSelected'}`}
                    onClick={() => setTab(t)} 
                    key={i}
                >
                    <p>{t.name}</p>
                    <p>({t.caption})</p>
                </div>)
            }
        </div>
        {tab.component}

    </div>
}

export default AddMatch
