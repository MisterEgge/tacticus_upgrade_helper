"use client";
import {useState} from "react";

/** Keep the full label available to assistive technology and when artwork cannot load. */
export default function GameBadge({src,label,kind,decorative=false}:{src:string|null;label:string;kind:"rank"|"rarity";decorative?:boolean}) {
 const [failed,setFailed]=useState<string|null>(null);
 if(!src||failed===src)return <span aria-hidden={decorative||undefined}>{label}</span>;
 return <span className={`gameBadge ${kind}Badge`} role={decorative?undefined:"img"} aria-label={decorative?undefined:label} aria-hidden={decorative||undefined} title={label}><img src={src} alt="" width={kind==="rank"?36:25} height={kind==="rank"?36:25} onError={()=>setFailed(src)}/></span>;
}
