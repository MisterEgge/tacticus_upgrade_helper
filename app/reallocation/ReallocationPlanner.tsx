"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import ResourceName from "../components/ResourceName";
import CollapsibleSection from "../components/CollapsibleSection";
import ReferenceDetails from "../components/ReferenceDetails";
import {gearRoles,planLegendaryReallocation,type ReallocationTarget,type ReallocationUnit,type GearHolding} from "../../src/domain/legendaryReallocation";
import {selectedWarGearGoals,type EquipmentWarTeam} from "../../src/domain/equipmentGoals";
import {WAR_PLAN_STORAGE_KEY} from "../../src/domain/warBadgeTargets";
import type {EquipmentCharacter,EquipmentDefinition} from "../../src/domain/equipmentCompatibility";
import type {EquipmentFocus} from "../../src/domain/equipmentFocus";

export type ReallocationProps={units:ReallocationUnit[];targets:ReallocationTarget[];characters:EquipmentCharacter[];equipment:Record<string,EquipmentDefinition>;raidNames:string[];raidOptions:string[];campaignNames:string[];campaignUnknown:string[];focus:Record<string,EquipmentFocus>;defenseTeams:EquipmentWarTeam[];offenseTeams:EquipmentWarTeam[]};
function Holder({item}:{item:GearHolding}){return <Link className="characterLink" href={`/characters/${encodeURIComponent(item.characterId)}`}><CharacterName name={item.character} id={item.characterId}/></Link>;}
function Item({item}:{item:GearHolding}){return <><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.itemId)}`}><ResourceName id={item.itemId} name={item.itemName}/></Link><small>Level {item.level}</small></>;}

export default function ReallocationPlanner(props:ReallocationProps){
 const [saved,setSaved]=useState<unknown>(null),[ready,setReady]=useState(false),[warUnknown,setWarUnknown]=useState(false);
 useEffect(()=>{const read=()=>{try{const raw=localStorage.getItem(WAR_PLAN_STORAGE_KEY);setSaved(raw?JSON.parse(raw):null);setWarUnknown(false);}catch{setWarUnknown(true);}setReady(true);};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 if(!ready)return <div className="empty" role="status">Loading saved War teams…</div>;
 const war=selectedWarGearGoals(props.defenseTeams,props.offenseTeams,saved);
 const roles=gearRoles({...props,warNames:[...war.keys()]});
 const {transfers,review,protectedGear}=planLegendaryReallocation({...props,roles,warUnknown});
 return <>
  <section className="panel tablePanel" aria-label="Suggested gear transfers"><h2>Move to an active upgrade · {transfers.length}</h2><p className="sub">Selected Raid team first. Each listed copy has one compatible recipient.</p>{transfers.length?<div className="tableWrap"><table><thead><tr><th>Move from</th><th>Item</th><th>Equip on</th><th>Replace</th></tr></thead><tbody>{transfers.map(item=><tr key={`${item.characterId}:${item.slotId}`}><td><Holder item={item}/></td><td><Item item={item}/></td><td><Link className="characterLink" href={`/characters/${encodeURIComponent(item.recipientId)}#equipment`}><CharacterName name={item.recipient} id={item.recipientId}/></Link><small>{item.role}</small></td><td><ResourceName id={item.replacesId} name={item.replacesName}/><small>Level {item.replacesLevel} · keep the replaced item</small></td></tr>)}</tbody></table></div>:<div className="empty">No useful transfers found. Keep gear equipped.</div>}</section>
  {review.length?<CollapsibleSection title={`Keep equipped · ${review.length}`} summary="No useful transfer found" defaultOpen={false} className="panel tablePanel"><div className="tableWrap"><table><thead><tr><th>Holder</th><th>Item</th><th>Next action</th></tr></thead><tbody>{review.map(item=><tr key={`${item.characterId}:${item.slotId}`}><td><Holder item={item}/></td><td><Item item={item}/></td><td>{item.action}</td></tr>)}</tbody></table></div></CollapsibleSection>:null}
  <CollapsibleSection title={`Protected gear · ${protectedGear.length}`} summary="Keep on Raid, War and campaign characters" defaultOpen={false} className="panel tablePanel">{protectedGear.length?<div className="tableWrap"><table><thead><tr><th>Holder</th><th>Item</th><th>Why it stays</th></tr></thead><tbody>{protectedGear.map(item=><tr key={`${item.characterId}:${item.slotId}`}><td><Holder item={item}/></td><td><Item item={item}/></td><td>{item.reason}</td></tr>)}</tbody></table></div>:<p>No protected Legendary holdings.</p>}</CollapsibleSection>
  <ReferenceDetails label="How transfers are chosen"><p>Uses your current roster, selected Raid lineup, saved War teams, recorded Raid core/flex options, planned roles, and unfinished campaign requirements. Missing campaign progress keeps required characters protected.</p><p>Recipients must have a current equipment upgrade, confirmed item compatibility, sufficient rarity, and meet the replacement’s minimum item level. Ready inventory upgrades take precedence. Each equipped copy and recipient slot is used once. Protected holders never supply transfers.</p><p>These are suggestions to apply in-game. Moving gear does not update the account export; sync after making changes.</p><Link className="sourceLink" href="/equipment">Review equipment upgrades</Link></ReferenceDetails>
 </>;
}
