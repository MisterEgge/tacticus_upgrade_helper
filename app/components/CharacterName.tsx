"use client";import{useState}from"react";
function fallback(name:string){return name.slice(0,1).toUpperCase();}
export default function CharacterName({name,id,icon}:{name:string;id?:string|undefined;icon?:string|undefined}){const[failed,setFailed]=useState(false);const src=id?`/characters/${id}.png`:icon??null;return <span className="characterCell">{src&&!failed?<img className="portrait" src={src} alt={name} loading="lazy" onError={()=>setFailed(true)}/>:<span className="portrait fallback">{fallback(name)}</span>}<strong>{name}</strong></span>;}
