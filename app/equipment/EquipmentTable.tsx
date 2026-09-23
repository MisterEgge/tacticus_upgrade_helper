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
 return <div className="campaignInvestmentList">{rows.map(row=><section className="campaignInvestmentGroup" key={row.character}><button className="campaignSectionToggle" onClick={()=>setOpen(open===row.character?null:row.character)}><div><p className="eyebrow">{row.slots.length} LEGENDARY UPGRADE {row.slots.length===1?"SLOT":"SLOTS"}</p><h2><CharacterName name={row.character} id={row.characterId}/></h2><p className="warSource">{row.slots.map(slot=>`${slot.slotId}: ${slot.target}`).join(" · ")}</p></div><div className="campaignSectionStatus"><span className="campaignChevron">{open===row.character?"▴":"▾"}</span></div></button>{open===row.character?<div className="campaignSectionBody"><div className="tableWrap"><table><thead><tr><th>Slot</th><th>Upgrade</th><th>Inventory</th><th>Equipped elsewhere</th><th>Acquire</th></tr></thead><tbody>{row.slots.map(slot=><tr key={slot.slotId}><td><strong>{slot.slotId}</strong><small>{slot.currentItem} · {slot.currentRarity} {slot.currentLevel}</small></td><td><strong>{slot.target}</strong><small>{slot.state}</small></td><td className={slot.available?"ready":"below"}><strong>{slot.available}</strong><small>{slot.available?"exact copy available":"none available"}</small></td><td>{slot.holders.length?slot.holders.map((holder,index)=><span key={`${holder.characterId}:${holder.slotId}`}>{index?" · ":""}<Link className="sourceLink" href={`/characters/${holder.characterId}`}>{holder.character}</Link><small className="inlineDetail">{holder.slotId} L{holder.level}</small></span>):<small>None</small>}<small>Reference only</small></td><td>{slot.acquisition.map((source,index)=><span key={source.id}>{index?" · ":""}<Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>{source.name}</Link><small className="inlineDetail">{source.shops.join(" / ")||"details"}</small></span>)}</td></tr>)}</tbody></table></div></div>:null}</section>)}</div>;
}
