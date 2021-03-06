import { Link, useLocation } from 'react-router-dom';
import React from 'react';

export interface ITab {
    label: string,
    route: string,
    otherPaths: string[],
    component: () => JSX.Element
}

export enum CompareType {
    inOrder = -1,
    same = 0,
    outOfOrder = 1
}

export type CompareFunc = (a: any, b: any) => CompareType;

export const CompareNumbers = (aNum: number, bNum: number): CompareType => {
    if (aNum == bNum) return CompareType.same;
    return aNum < bNum ? CompareType.inOrder : CompareType.outOfOrder;
}

export const NumericCompareFunc = (numFunc: (inp: any) => number): CompareFunc => 
    (a, b) => CompareNumbers(numFunc(a), numFunc(b));

export function Tab({tab}: {tab: ITab}){

    const location = useLocation();
    let isSelected = location.pathname.startsWith(tab.route);

    return <Link 
        to={tab.route} 
        className={`tab centerAll ${isSelected ? "selected": "notSelected"} clickable`}
    >
        {tab.label}
    </Link>
}

export const EnumArray = (e: any): string[] => 
    Object.values(e).filter((s: any) => isNaN(s)) as string[];


export enum RestfulType {
    POST,
    GET,
    PUT
}

export async function CallAPI(
    url: string, 
    method: RestfulType, 
    body: any = null,
    headers: any = {}
): Promise<any> {
	url = url.replace(/[ \t\n]/g, ''); // get rid of empty spaces and newlines
    var fullUrl = `${process.env.PUBLIC_URL || './'}/${url}`;
	return new Promise(async (resolve, reject) => {
        fetch(fullUrl, {
            method: RestfulType[method],
            body: body,
            headers: headers
        }).then(async (response) => {
            if (!response.ok){
                reject(await response.json());
            } else {
                resolve(await response.json());
            }
        });
	});
}

export const CallAPIJson = async (
    url: string,
    method: RestfulType,
    body: Object
) => CallAPI(
    url, 
    method, 
    JSON.stringify(body),
    {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
);

var LEAGUE_VERSION: string|undefined = undefined;
export const updateLeagueVersion = async () => LEAGUE_VERSION ?? (LEAGUE_VERSION = (await CallAPI('/getLeagueVersion', RestfulType.GET))['res']);

export const GetProfileIconUrl = (iconId: number): string => `http://ddragon.leagueoflegends.com/cdn/${LEAGUE_VERSION}/img/profileicon/${iconId}.png`;

export const GetChampIconUrl = (champ: string): string => `http://ddragon.leagueoflegends.com/cdn/${LEAGUE_VERSION}/img/champion/${champ}.png`;
export const GetChampDisplayName = (champ: string): string => {
    switch(champ){
        case "MonkeyKing":
            return "Wukong";
        default:
            return champ.replace(/([^A-Z])([A-Z])/g, (_, lower, upper) => `${lower} ${upper}`);
    }
}

export const GetItemIconUrl = (iconId: number): string => `https://ddragon.leagueoflegends.com/cdn/${LEAGUE_VERSION}/img/item/${iconId}.png`;
export const GetSpellIconUrl = (spellName: string): string => `https://ddragon.leagueoflegends.com/cdn/${LEAGUE_VERSION}/img/spell/${spellName}.png`;
export const GetKeystoneIconUrl = (partialUrl: string): string => `https://ddragon.leagueoflegends.com/cdn/img/${partialUrl}`;

//https://stackoverflow.com/questions/1322732/convert-seconds-to-hh-mm-ss-with-javascript
export const secsToHMS = (secs: number): string => {
    const hourInSecs = 60*60;
    let dateStr = new Date(secs * 1000).toISOString();
    const endIndex = 19;
    let len = 8;
    if (secs < hourInSecs) len -= 3;
    return dateStr.substr(endIndex - len, len);
};