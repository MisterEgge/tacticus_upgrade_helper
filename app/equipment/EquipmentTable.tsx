"use client";
import {useState}from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import type {EquipmentRow} from "../lib/report";

type Source={id:string;name:string;shops:string[]};
type Holder={character:string;characterId:string;slotId:string;level:number};
type Slot=EquipmentRow&{state:string;target:string;acquisition:Source[];available:number;holders:Holder[]};
type Row={character:string;characterId?:string;slots:Slot[]};

export default function EquipmentTable({rows}:{rows:Row[]})
{
 const[open,setOpen]=useState<string|null>(rows[0]?.character??null);
 return <div className="campaignInvestmentList">{rows.map(row=><section className="campaignInvestmentGroup" key={row.character}><button className="campaignSectionToggle" onClick={()=>setOpen(open===row.character?null:row.character)}><div><p className="eyebrow">{row.slots.length} LEGENDARY UPGRADE {row.slots.length===1?"SLOT":"SLOTS"}</p><h2><CharacterName name={row.character} id={row.characterId}/></h2><p className="warSource">{row.slots.map(slot=>`${slot.slotId}: ${slot.target}`).join(" · ")}</p></div><div className="campaignSectionStatus"><span className="campaignChevron">{open===row.character?"▴":"▾"}</span></div></button>{open===row.character?<div className="campaignSectionBody">{row.slots.map(slot=><div className="campaignInvestmentGroup" key={slot.slotId}><div className="sectionTitle"><div><p className="eyebrow">{slot.slotId}</p><h3>{slot.target}</h3><p className="sub">Currently: {slot.currentItem} · {slot.currentRarity} level {slot.currentLevel}</p></div><div className="power">{slot.available}<strong> in inventory</strong></div></div><div className="cards compact"><div className="card"><strong>{slot.holders.length}</strong><span>other holders</span><small>{slot.holders.length?"Reference only — not a take recommendation":"No equipped copy found"}</small></div><div className="card"><strong>{slot.acquisition.length}</strong><span>known source routes</span><small>Open each route for full details</small></div></div>{slot.holders.length?<p className="sub">Other holders: {slot.holders.map((holder,index)=><span key={`${holder.characterId}:${holder.slotId}`}>{index?" · ":""}<Link className="sourceLink" href={`/characters/${holder.characterId}`}>{holder.character}</Link> ({holder.slotId}, level {holder.level})</span>)}</p>:null}<div className="sourceList">{slot.acquisition.map(source=><div key={source.id}><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>{source.name}</Link><small>{source.shops.length?source.shops.join(" · "):"Open acquisition details; shop and campaign coverage may still be under research"}</small></div>)}</div></div>)}</div>:null}</section>)}</div>;
}
