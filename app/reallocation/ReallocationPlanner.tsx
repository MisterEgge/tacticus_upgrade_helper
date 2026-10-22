"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import ResourceName from "../components/ResourceName";
import {gearRoles,planLegendaryReallocation,type ReallocationTarget,type ReallocationUnit,type GearHolding,type GearTransfer} from "../../src/domain/legendaryReallocation";
import {selectedWarGearGoals,type EquipmentWarTeam} from "../../src/domain/equipmentGoals";
import {WAR_PLAN_STORAGE_KEY} from "../../src/domain/warBadgeTargets";
import type {EquipmentCharacter,EquipmentDefinition} from "../../src/domain/equipmentCompatibility";
import type {EquipmentFocus} from "../../src/domain/equipmentFocus";

export type ReallocationProps={units:ReallocationUnit[];targets:ReallocationTarget[];characters:EquipmentCharacter[];equipment:Record<string,EquipmentDefinition>;raidNames:string[];raidOptions:string[];campaignNames:string[];campaignUnknown:string[];focus:Record<string,EquipmentFocus>;defenseTeams:EquipmentWarTeam[];offenseTeams:EquipmentWarTeam[]};
function Holder({item}:{item:GearHolding}){return <Link className="characterLink" href={`/characters/${encodeURIComponent(item.characterId)}`}><CharacterName name={item.character} id={item.characterId}/></Link>;}
function Item({item}:{item:GearHolding}){return <><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.itemId)}`}><ResourceName id={item.itemId} name={item.itemName}/></Link><small>Level {item.level}</small></>;}

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
  <section className="panel tablePanel" aria-label="Suggested gear transfers">{transfers.length?<h2>Suggested transfers ({transfers.length})</h2>:null}{transfers.length?<div className="tableWrap"><table><thead><tr><th>Move from</th><th>Item</th><th>Equip on</th><th>Replace</th></tr></thead><tbody>{transfers.map(item=><tr key={`${item.characterId}:${item.slotId}`}><td><Holder item={item}/></td><td><Item item={item}/></td><td><Link className="characterLink" href={`/characters/${encodeURIComponent(item.recipientId)}#equipment`}><CharacterName name={item.recipient} id={item.recipientId}/></Link><small>{item.role}</small></td><td><ResourceName id={item.replacesId} name={item.replacesName}/><small>Level {item.replacesLevel}</small></td></tr>)}</tbody></table></div>:<div className="empty">No gear transfers recommended.</div>}</section>
  {transfers.length?<p className="sub">Apply these moves in-game, then sync your account.</p>:null}
 </>;
}
