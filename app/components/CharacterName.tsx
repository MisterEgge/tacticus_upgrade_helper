"use client";
function fallback(name:string){return name.slice(0,1).toUpperCase();}
export default function CharacterName({name,id,icon}:{name:string;id?:string;icon?:string}){
 const src=icon?`https://tacticusplanner.app/img/characters/${encodeURIComponent(icon)}`:null;
 return <span className="characterCell">{src?<img className="portrait" src={src} alt={name} loading="lazy"/>:<span className="portrait fallback">{fallback(name)}</span>}<strong>{name}</strong></span>;
}
