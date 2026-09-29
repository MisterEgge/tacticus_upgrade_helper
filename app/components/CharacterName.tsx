"use client";import{useState}from"react";
type Props={name:string;id?:string|undefined;icon?:string|undefined};
function fallback(name:string){return name.slice(0,1).toUpperCase();}
export function CharacterPortrait({name,id,icon}:Props){const[failed,setFailed]=useState(false);const src=id?`/characters/${id}.png`:icon??null;return src&&!failed?<img className="portrait" src={src} alt={name} title={name} loading="lazy" onError={()=>setFailed(true)}/>:<span className="portrait fallback" role="img" aria-label={name} title={name}>{fallback(name)}</span>;}
export default function CharacterName({name,id,icon}:Props){return <span className="characterCell"><CharacterPortrait name={name} id={id} icon={icon}/><strong>{name}</strong></span>;}
