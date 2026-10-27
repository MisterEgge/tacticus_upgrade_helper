"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import ResourceName from "../components/ResourceName";
import EquipmentSlot,{equipmentSlotLabel} from "../components/EquipmentSlot";
import RarityBadge from "../components/RarityBadge";
import {gearRoles,planLegendaryReallocation,type ReallocationTarget,type ReallocationUnit,type GearHolding,type GearTransfer} from "../../src/domain/legendaryReallocation";
import {selectedWarGearGoals,type EquipmentWarTeam} from "../../src/domain/equipmentGoals";
import {WAR_PLAN_STORAGE_KEY} from "../../src/domain/warBadgeTargets";
import type {EquipmentCharacter,EquipmentDefinition} from "../../src/domain/equipmentCompatibility";
import type {EquipmentFocus} from "../../src/domain/equipmentFocus";

export type ReallocationProps={units:ReallocationUnit[];targets:ReallocationTarget[];characters:EquipmentCharacter[];equipment:Record<string,EquipmentDefinition>;raidNames:string[];raidOptions:string[];campaignNames:string[];campaignUnknown:string[];focus:Record<string,EquipmentFocus>;defenseTeams:EquipmentWarTeam[];offenseTeams:EquipmentWarTeam[]};
function Holder({item}:{item:GearHolding}){return <Link className="characterLink" href={`/characters/${encodeURIComponent(item.characterId)}`}><CharacterName name={item.character} id={item.characterId}/></Link>;}

export function useGearTransfers(props:ReallocationProps){
 const [saved,setSaved]=useState<unknown>(null),[ready,setReady]=useState(false),[warUnknown,setWarUnknown]=useState(false);
 useEffect(()=>{const read=()=>{try{const raw=localStorage.getItem(WAR_PLAN_STORAGE_KEY);setSaved(raw?JSON.parse(raw):null);setWarUnknown(false);}catch{setWarUnknown(true);}setReady(true);};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 const war=selectedWarGearGoals(props.defenseTeams,props.offenseTeams,saved);
 const roles=gearRoles({...props,warNames:[...war.keys()]});
 const {transfers}=planLegendaryReallocation({...props,roles,warUnknown});
 return {ready,transfers:ready?transfers:[]};
}

export default function ReallocationPlanner(props:ReallocationProps){
 const {ready,transfers}=useGearTransfers(props);
 if(!ready)return <div className="empty" role="status">Loading saved War teams...</div>;
 return <GearTransferTable transfers={transfers}/>;
}

export function GearTransferTable({transfers,hideEmpty=false}:{transfers:GearTransfer[];hideEmpty?:boolean}){
 if(hideEmpty&&!transfers.length)return null;
 return <>
  <section className="gearTransfers" aria-label="Suggested gear transfers">{transfers.length?<h2>Transfers ({transfers.length})</h2>:null}{transfers.length?<ol className="gearTransferList">{transfers.map(item=><li className="gearTransferCard" key={`${item.characterId}:${item.slotId}`}>
   <div className="gearTransferRoute" role="group" aria-label={`Transfer from ${item.character} to ${item.recipient}`}>
    <div><small>From</small><Holder item={item}/><EquipmentSlot slotId={item.slotId}/></div>
    <span className="gearTransferArrow" aria-hidden="true">→</span>
    <div><small>To</small><Link className="characterLink" href={`/characters/${encodeURIComponent(item.recipientId)}#equipment`}><CharacterName name={item.recipient} id={item.recipientId}/></Link><EquipmentSlot slotId={item.recipientSlot}/></div>
   </div>
   <div className="gearTransferReplacement" role="group" aria-label={`Replace equipment in ${equipmentSlotLabel(item.recipientSlot)}`}>
    <div><small>Replace</small><ResourceName id={item.replacesId} name={item.replacesName}/><small className="gearTransferItemMeta">{item.replacesRarity?<RarityBadge rarity={item.replacesRarity}/>:null}Level {item.replacesLevel}</small></div>
    <span className="gearTransferArrow" aria-hidden="true">→</span>
    <div><small>With</small><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.itemId)}`}><ResourceName id={item.itemId} name={item.itemName}/></Link><small className="gearTransferItemMeta">{item.rarity?<RarityBadge rarity={item.rarity}/>:null}Level {item.level}</small></div>
   </div>
   <details><summary>Why this transfer</summary><p>{item.character}: {item.reason}. {item.recipient}: {item.role}.</p><p>{item.character}&apos;s {equipmentSlotLabel(item.slotId)} will be empty after the move.</p></details>
  </li>)}</ol>:<div className="empty">No gear transfers recommended.</div>}</section>
  {transfers.length?<p className="sub">Apply these moves in-game, then sync your account.</p>:null}
 </>;
}
