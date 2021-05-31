import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useLocation } from 'react-router-dom';
import { EnumArray, GetChampIconUrl, RestfulType, waitForAjaxCall } from './Utilities';
import "./AddMatch.css";
import Icons from './Icons';

function AddMatch(){

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
        waitForAjaxCall("/addMatchHTML", RestfulType.POST, data)
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

    return <div id="addMatch" className="col centerCross">
        <p>Custom games are considered private data, and as a result, not available in riot APIs.</p>
        <p>
            To submit a match, please navigate to the game 
            at <a href="https://matchhistory.na.leagueoflegends.com">matchhistory.na.leagueoflegends.com</a>, 
            and either save and upload the html file, or if you’re technically inclined, paste the html code.
        </p>
        {
            isLoading ? <div className="loader"></div> : <>
                <label>
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
    </div>
}

export default AddMatch