"use client";
import {useGearTransfers,GearTransferTable,type ReallocationProps} from "../reallocation/ReallocationPlanner";
import EquipmentSlot,{equipmentSlotLabel} from "../components/EquipmentSlot";
import ShopShoppingList from "./ShopShoppingList";
import {groupEquipmentShopping} from "../../src/domain/equipmentShopping";
import RarityBadge from "../components/RarityBadge";

import InventoryRefinements from "./InventoryRefinements";
import ResourceName,{ResourceIcon} from "../components/ResourceName";
import {useState,useEffect,useMemo} from "react";
import Link from "next/link";
import ReferenceDetails from "../components/ReferenceDetails";
import CollapsibleSection from "../components/CollapsibleSection";
import CharacterName from "../components/CharacterName";
import type {EquipmentRow} from "../lib/report";
import {equipmentTargetRarities,type EquipmentTargetRarity} from "../../src/domain/equipmentTier";
import type {EquipmentShopOffer} from "../../src/domain/shops";
import {equipmentTeamGoal,equipmentOptionFitsGoal,selectedWarGearGoals,type EquipmentScope,type EquipmentWarTeam} from "../../src/domain/equipmentGoals";
import {WAR_PLAN_STORAGE_KEY} from "../../src/domain/warBadgeTargets";

type Source={id:string;name:string;shops:string[];offers:EquipmentShopOffer[]};
type Holder={character:string;characterId:string;slotId:string;level:number};
type Slot=EquipmentRow&{currentItemId?:string|undefined;state:string;target:string;itemRarity:EquipmentTargetRarity;acquisition:Source[];available:number;freeCopies:number;allocatedItemId?:string;holders:Holder[];goalLabel?:string;reason?:string;minimumLevel?:number;allocatedLevel?:number;copiesToLevel?:number};
type Row={character:string;characterId?:string;rarity:string;slots:Slot[]};
function ItemIcon({id}:{id:string}){return <ResourceIcon id={id}/>;}
function UpgradeItem({slot}:{slot:Slot}){
 const source=slot.acquisition.find(source=>source.id===slot.allocatedItemId)??slot.acquisition[0];
 return <span className="itemName">{source?<ItemIcon id={source.id}/>:null}{source?<Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>{source.name}</Link>:<strong>{slot.target}</strong>}</span>;
}
function UpgradeTable({slots,kind}:{slots:Slot[];kind:"ready"|"level"}){
 return <div className="tableWrap"><table><thead><tr><th>Character</th><th>{kind==="ready"?"Equip this":"Item to level"}</th><th>{kind==="ready"?"Replace":"Next goal"}</th></tr></thead><tbody>{slots.map(slot=><tr key={`${slot.character}:${slot.slotId}:${slot.itemRarity}`}><td><CharacterName name={slot.character} id={slot.characterId}/><EquipmentSlot slotId={slot.slotId}/><small>{slot.goalLabel}</small></td><td>{kind==="ready"?<><UpgradeItem slot={slot}/><small>Level {slot.allocatedLevel??1}</small></>:<><ResourceName id={slot.currentItemId??""} name={slot.currentItem}/><small>Level {slot.currentLevel}</small></>}</td><td>{kind==="ready"?<><ResourceName id={slot.currentItemId??""} name={slot.currentItem}/><small><RarityBadge rarity={slot.currentRarity}/> / level {slot.currentLevel}</small></>:<>{slot.target}<small>Check coins and salvage</small></>}</td></tr>)}</tbody></table></div>;
}

export default function EquipmentTable({rows,inventory,raidNames,campaignNames,defenseTeams,offenseTeams,transferContext}:{transferContext:ReallocationProps;rows:Row[];inventory:ReadonlyArray<{id:string;amount:number;level:number}>;raidNames:string[];campaignNames:string[];defenseTeams:EquipmentWarTeam[];offenseTeams:EquipmentWarTeam[]})
{
 const {transfers}=useGearTransfers(transferContext);
 const transferredSlots=new Set(transfers.map(item=>`${item.recipient}:${item.recipientSlot}`));
 const [scope,setScope]=useState<EquipmentScope>("raid");
 const [savedPlan,setSavedPlan]=useState<unknown>(null);
 useEffect(()=>{const read=()=>{try{setSavedPlan(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedPlan(null);}};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 const warGoals=useMemo(()=>selectedWarGearGoals(defenseTeams,offenseTeams,savedPlan),[defenseTeams,offenseTeams,savedPlan]);
 const raid=new Set(raidNames),campaign=new Set(campaignNames);
 const [selected,setSelected]=useState<Record<EquipmentTargetRarity,boolean>>({Uncommon:false,Rare:false,Epic:true,Legendary:true});
 const goalScope=scope==="teams"||scope==="raid"||scope==="war";
 const scopedRows=rows.flatMap(row=>{
  const goal=equipmentTeamGoal(row.character,row.rarity,raid,warGoals,scope);
  if(goalScope&&!goal||scope==="campaign"&&!campaign.has(row.character))return [];
  const slots=row.slots.filter(slot=>slot.state==="EQUIP NOW"||(goal?equipmentOptionFitsGoal(slot.currentRarity,slot.itemRarity,row.rarity,goal):selected[slot.itemRarity]&&["Common",...equipmentTargetRarities,"Mythic"].indexOf(slot.itemRarity)>=["Common",...equipmentTargetRarities,"Mythic"].indexOf(slot.currentRarity))).map(slot=>goal?{...slot,goalLabel:goal.priority===100?goal.label:`${goal.label} · ${goal.rarity} ${goal.level}`}:slot);
  return [{...row,slots,goal}];
 }).sort((a,b)=>Number(raid.has(b.character))-Number(raid.has(a.character))||(b.goal?.priority??0)-(a.goal?.priority??0));
 const [view,setView]=useState<"actions"|"shops">("actions");
 const [query,setQuery]=useState("");
 const matches=(value:string)=>value.toLowerCase().includes(query.toLowerCase().trim());
 const matchesSlot=(slot:Slot)=>matches(`${slot.character} ${equipmentSlotLabel(slot.slotId)} ${slot.currentItem} ${slot.target} ${slot.acquisition.flatMap(source=>source.offers.map(offer=>offer.shop)).join(" ")}`);
 const readyInScope=scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW"));
 const ready=readyInScope.filter(matchesSlot);
 const outsideReady=rows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW")).length-readyInScope.length;
 const assignedSlots=new Set(rows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW").map(slot=>`${slot.character}:${slot.slotId}`)));
 const levelActions=scopedRows.flatMap(row=>row.slots.filter(slot=>(slot.state==="LEVEL UP"||slot.state==="LEVEL INVENTORY")&&!assignedSlots.has(`${slot.character}:${slot.slotId}`)&&!transferredSlots.has(`${slot.character}:${slot.slotId}`)&&matchesSlot(slot)));

 const visibleTransfers=transfers.filter(item=>scopedRows.some(row=>row.character===item.recipient&&row.slots.some(slot=>slot.slotId===item.recipientSlot&&slot.acquisition.some(source=>source.id===item.itemId)))&&matches(`${item.character} ${item.recipient} ${item.itemName} ${item.replacesName} ${equipmentSlotLabel(item.slotId)} ${equipmentSlotLabel(item.recipientSlot)}`));
 const refinementSlots=new Set(scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state==="LEVEL INVENTORY").map(slot=>`${slot.character}:${slot.slotId}`)));
 const shopUpgrades=[...scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL INVENTORY"&&!refinementSlots.has(`${slot.character}:${slot.slotId}`)&&slot.freeCopies<=0&&!transferredSlots.has(`${slot.character}:${slot.slotId}`)&&!assignedSlots.has(`${slot.character}:${slot.slotId}`)).flatMap(slot=>slot.acquisition.filter(source=>source.offers.length).map(source=>({slot,source})))).reduce((choices,choice)=>choices.set(`${choice.slot.character}:${choice.slot.slotId}:${choice.source.id}`,choice),new Map<string,{slot:Slot;source:Source}>()).values()];
 const shoppingItems=groupEquipmentShopping(shopUpgrades).filter(item=>matches(`${item.name} ${item.members.map(({slot})=>`${slot.character} ${slot.currentItem} ${equipmentSlotLabel(slot.slotId)}`).join(" ")} ${item.offers.map(offer=>`${offer.shop} ${offer.rotation}`).join(" ")}`));
 return <>
  <div className="abilityViews"><label>Upgrade focus<select aria-label="Equipment upgrade focus" value={scope} onChange={event=>setScope(event.target.value as EquipmentScope)}><option value="raid">Main raid team</option><option value="teams">Raid first, then active War teams</option><option value="war">Active War teams</option><option value="campaign">Incomplete campaigns</option><option value="all">Full roster</option></select></label></div>
  <input className="equipmentSearch" aria-label="Search equipment upgrades" placeholder="Search character, item, slot, or shop…" value={query} onChange={event=>setQuery(event.target.value)}/>
  {scope==="raid"&&!raidNames.length?<p className="sub">Choose your <Link className="sourceLink" href="/guild-raid">main Raid team</Link> to see its equipment upgrades.</p>:null}
  <ReferenceDetails label="Equipment goals and caps"><p>{goalScope?"Raid shows useful Epic and Legendary alternatives where compatible. Gold War minimum is Epic 9; Silver War minimum is Rare 7. These are minimum goals, not downgrade instructions. Higher tiers remain alternatives, not additional required copies. Defense reserves are excluded.":"Choose target rarities for this planning view."}</p><p>Your selected Raid team gets first choice of inventory upgrades. Each copy is assigned once across the roster. Block replacements favor verified higher chance. The refinement threshold compares expected blocked damage over three hits using the equipped booster; it is general guidance, not a survival guarantee. Level-up affordability and current shop stock must be checked in-game.</p></ReferenceDetails>
  <div className="abilityViews equipmentViewTabs" aria-label="Equipment views"><button aria-pressed={view==="actions"} className={view==="actions"?"active":""} onClick={()=>setView("actions")}>Actions</button><button aria-pressed={view==="shops"} className={view==="shops"?"active":""} onClick={()=>setView("shops")}>Shop upgrades</button></div>
  <div hidden={view!=="actions"}>
  <CollapsibleSection title="Equip now" summary={`${ready.length} upgrades ready from inventory`} className="equipmentActions">
   {ready.length?<UpgradeTable slots={ready} kind="ready"/>:<p className="sub">{query.trim()?"No inventory upgrades match this search.":"No inventory upgrades ready for this team."}</p>}
   {outsideReady>0?<button className="sourceLink" onClick={()=>setScope("all")}>{outsideReady} equip-now actions outside this focus · View full roster</button>:null}
  </CollapsibleSection>
  <GearTransferTable transfers={visibleTransfers} hideEmpty/>
  <InventoryRefinements slots={levelActions.filter(slot=>slot.state==="LEVEL INVENTORY")} inventory={inventory}/>
  {levelActions.some(slot=>slot.state==="LEVEL UP")?<CollapsibleSection title="Level equipped gear" defaultOpen={false} summary={`${levelActions.filter(slot=>slot.state==="LEVEL UP").length} equipped items`}><UpgradeTable slots={levelActions.filter(slot=>slot.state==="LEVEL UP")} kind="level"/></CollapsibleSection>:null}

  </div>
  {!goalScope?<fieldset className="equipmentRarityFilter"><legend>Target rarity</legend>{equipmentTargetRarities.map(rarity=><label key={rarity}><input type="checkbox" checked={selected[rarity]} onChange={event=>setSelected(current=>({...current,[rarity]:event.target.checked}))}/><RarityBadge rarity={rarity}/></label>)}</fieldset>:null}
  <div hidden={view!=="shops"}><section className="equipmentShopSummary" aria-label="Shop upgrade opportunities"><h2>Shopping list <small>{shoppingItems.length} item choices</small></h2><ShopShoppingList items={shoppingItems}/></section></div>

 </>;
}
