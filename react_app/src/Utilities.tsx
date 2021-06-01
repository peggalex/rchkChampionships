import { Link, useLocation } from 'react-router-dom';
import React from 'react';

export interface ITab {
    label: string,
    route: string,
    otherPaths: string[],
    component: () => JSX.Element
}

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
    var fullUrl = `${process.env.PUBLIC_URL}/${url}`;
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


export const GetChampIconUrl = (champ: string): string => `http://ddragon.leagueoflegends.com/cdn/11.11.1/img/champion/${champ}.png`;
export const GetChampDisplayName = (champ: string): string => champ.replace(/([A-Z])/g, (m) => ` ${m}`).trim();