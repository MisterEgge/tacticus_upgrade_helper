"use client";
import ReferenceDetails from "../components/ReferenceDetails";
import {useState} from "react";
import CharacterName from "../components/CharacterName";
import type {UtilityRating,UtilityTier} from "../../src/domain/characterUtility";

type Row=UtilityRating & {id:string;alliance:string;owned:boolean};
const order:Record<UtilityTier,number>={Core:4,Strong:3,Useful:2,Situational:1,"No tracked signal":0};
export default function RatingTable({rows}:{rows:Row[]})
{
    const[query,setQuery]=useState("");
    const[ownership,setOwnership]=useState("owned");
    const filtered=rows.filter(row=>(ownership==="all"||row.owned)&&`${row.name} ${row.alliance} ${row.tier} ${row.signals.join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>order[b.tier]-order[a.tier]||(b.communityScore??0)-(a.communityScore??0)||a.name.localeCompare(b.name));
    return <><div className="abilityViews"><label>Roster<select value={ownership} onChange={event=>setOwnership(event.target.value)}><option value="owned">Owned</option><option value="all">All catalog characters</option></select></label><label>Find character<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, tier or reason"/></label></div>
        <p className="sub">{filtered.length} characters shown.</p>
        <div className="tableWrap"><table><thead><tr><th>Character</th><th>Planning tier</th><th>Tracked reasons</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}>
            <td><CharacterName name={row.name} id={row.id}/><small>{row.alliance} · {row.owned?"Owned":"Not owned"}</small></td><td><strong>{row.tier}</strong>{row.communityScore!==null?<small>Community score {row.communityScore}</small>:null}</td><td>{row.signals.length?<>{row.signals.slice(0,2).join(" · ")}{row.signals.length>2?<ReferenceDetails label={`${row.signals.length-2} more reasons`}>{row.signals.slice(2).join(" · ")}</ReferenceDetails>:null}</>:"No tracked usage or account priority yet"}</td>
        </tr>)}</tbody></table></div>
    </>;
}
