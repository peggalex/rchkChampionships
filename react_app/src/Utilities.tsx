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

export async function waitForAjaxCall(url: string, method: RestfulType): Promise<any> {
	url = url.replace(/[ \t\n]/g, ''); // get rid of empty spaces and newlines
    var fullUrl = `${url}`;
	return new Promise(async (resolve, reject) => {
        let response = await fetch(fullUrl, {
            method: RestfulType[method]
        });
        if (!response.ok) reject(`${response.status} | ${response.statusText} | url: ${fullUrl}`);
        resolve(response.json());
	});
}