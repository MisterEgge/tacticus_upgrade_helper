"use client";
import type {GearTransfer} from "../../src/domain/legendaryReallocation";
import {useGearTransfers,GearTransferTable,type ReallocationProps} from "../reallocation/ReallocationPlanner";
import EquipmentSlot,{equipmentSlotLabel} from "../components/EquipmentSlot";
import ShopShoppingList from "./ShopShoppingList";
import {groupEquipmentShopping} from "../../src/domain/equipmentShopping";
import RarityBadge from "../components/RarityBadge";

import ResourceName,{ResourceIcon,ResourceText} from "../components/ResourceName";
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
type Need={slotId:string;itemId:string;name:string;available:number;priority:number;characters:Array<{name:string;id?:string;focus:string[];priority:number}>};
const tier=(id:string):EquipmentTargetRarity|"Other"=>({U:"Uncommon",R:"Rare",E:"Epic",L:"Legendary"} as const)[id.match(/_([UREL])\d{3}$/)?.[1] as "U"|"R"|"E"|"L"]??"Other";
function ItemIcon({id}:{id:string}){return <ResourceIcon id={id}/>;}
function UpgradeItem({slot}:{slot:Slot}){
 const source=slot.acquisition.find(source=>source.id===slot.allocatedItemId)??slot.acquisition[0];
 return <span className="itemName">{source?<ItemIcon id={source.id}/>:null}{source?<Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>{source.name}</Link>:<strong>{slot.target}</strong>}</span>;
}
function OfferInfo({offer}:{offer:EquipmentShopOffer}){return <div><strong>{offer.shop}</strong><small>{offer.rotation} · <ResourceText text={offer.price}/></small><small>{offer.match==="pool"?"Random item pool · check stock":"Catalog offer · check stock"}{offer.adRefresh?" · Ad refresh":""}{offer.access==="unknown"?" · Access unverified":""}</small></div>;}
function SlotAction({slot,transfer}:{slot:Slot;transfer?:GearTransfer|undefined}){
 if(transfer)return <><strong>Move <ResourceName id={transfer.itemId} name={transfer.itemName}/> from <Link href={`/characters/${encodeURIComponent(transfer.characterId)}`}>{transfer.character}</Link></strong><small>From {equipmentSlotLabel(transfer.slotId)} / level {transfer.level}</small></>;
 if(slot.state==="EQUIP NOW")return <><strong className="ready">Upgrade now · equip from inventory</strong><small>One copy reserved for {slot.character} · level {slot.allocatedLevel??1}</small></>;
 if(slot.state==="LEVEL INVENTORY")return <><strong>Level up inventory gear before equipping</strong><small>{slot.copiesToLevel} copies need level {slot.minimumLevel} · check coins and salvage</small></>;
 if(slot.state==="LEVEL UP")return <><strong>Level up equipped item</strong><small>Check coins and salvage in-game before upgrading</small></>;
 return <>{slot.freeCopies>0?<><strong className="ready">Inventory alternative · {slot.freeCopies} unreserved copies</strong><small>Shared choices · no copy assigned to this option</small></>:null}{slot.acquisition.map(source=>{
  const offers=[...source.offers].sort((a,b)=>Number(b.match==="exact")-Number(a.match==="exact"));
  return <div className="equipmentSlotAction" key={source.id}><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>Where to get {source.name}</Link>{offers[0]?<><strong>Buy an upgrade here · {offers[0].shop}</strong><OfferInfo offer={offers[0]}/>{offers.length>1?<ReferenceDetails label={`${offers.length-1} other shop offers`}>{offers.slice(1).map(offer=><OfferInfo key={offer.id} offer={offer}/>)}</ReferenceDetails>:null}</>:<small>No eligible shop offer recorded · review sources</small>}</div>;
 })}</>;
}
function characterSummary(row:Row){
 const ready=row.slots.filter(slot=>slot.state==="EQUIP NOW");
 if(ready.length)return `Upgrade now · ${ready.length} inventory replacement${ready.length===1?"":"s"}`;
 if(row.slots.some(slot=>slot.state==="LEVEL INVENTORY"))return "Level up an inventory replacement before equipping";
 const shops=[...new Set(row.slots.flatMap(slot=>slot.acquisition.flatMap(source=>source.offers.map(offer=>offer.shop))))];
 if(shops.length)return `Buy an upgrade · ${shops.join(" / ")} · check stock`;
 if(row.slots.some(slot=>slot.state==="LEVEL UP"))return "Level up equipped gear · check coins and salvage";
 return row.slots.length?"No eligible shop offer recorded · review sources":"No verified replacement at the selected goals";
}
function UpgradeTable({slots,kind}:{slots:Slot[];kind:"ready"|"inventory"|"level"}){
 return <div className="tableWrap"><table><thead><tr><th>Character</th><th>{kind==="ready"?"Equip this":kind==="inventory"?"Available item":"Item to level"}</th><th>{kind==="ready"?"Replace":kind==="inventory"?"Copies available":"Next goal"}</th></tr></thead><tbody>{slots.map(slot=><tr key={`${slot.character}:${slot.slotId}:${slot.itemRarity}`}><td><CharacterName name={slot.character} id={slot.characterId}/><EquipmentSlot slotId={slot.slotId}/><small>{slot.goalLabel}</small></td><td>{kind==="level"?slot.state==="LEVEL INVENTORY"?<><UpgradeItem slot={slot}/><small>Inventory copy needs refinement</small></>:<><ResourceName id={slot.currentItemId??""} name={slot.currentItem}/><small>Level {slot.currentLevel}</small></>:<><UpgradeItem slot={slot}/>{kind==="ready"?<small>Level {slot.allocatedLevel??1}</small>:null}</>}</td><td>{kind==="ready"?<><ResourceName id={slot.currentItemId??""} name={slot.currentItem}/><small><RarityBadge rarity={slot.currentRarity}/> · level {slot.currentLevel}</small><strong className="ready">Upgrade now</strong></>:kind==="inventory"?slot.freeCopies:<>{slot.target}{slot.state==="LEVEL INVENTORY"?` · level ${slot.minimumLevel}`:""}<small>{slot.state==="LEVEL INVENTORY"?`Inventory replacement needs level ${slot.minimumLevel} before equipping · `:""}Check coins and salvage</small></>}</td></tr>)}</tbody></table></div>;
}

export default function EquipmentTable({rows,needs,raidNames,campaignNames,defenseTeams,offenseTeams,transferContext}:{transferContext:ReallocationProps;rows:Row[];needs:Need[];raidNames:string[];campaignNames:string[];defenseTeams:EquipmentWarTeam[];offenseTeams:EquipmentWarTeam[]})
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
 const [view,setView]=useState<"actions"|"shops"|"needed"|"characters">("actions");
 const [query,setQuery]=useState("");
 const matches=(value:string)=>value.toLowerCase().includes(query.toLowerCase().trim());
 const matchesSlot=(slot:Slot)=>matches(`${slot.character} ${equipmentSlotLabel(slot.slotId)} ${slot.currentItem} ${slot.target} ${slot.acquisition.flatMap(source=>source.offers.map(offer=>offer.shop)).join(" ")}`);
 const readyInScope=scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW"));
 const ready=readyInScope.filter(matchesSlot);
 const outsideReady=rows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW")).length-readyInScope.length;
 const inventoryOptions=scopedRows.flatMap(row=>row.slots.filter(slot=>slot.freeCopies>0&&!transferredSlots.has(`${slot.character}:${slot.slotId}`)&&slot.state!=="EQUIP NOW"&&slot.state!=="UNKNOWN"&&matchesSlot(slot)));
 const levelActions=scopedRows.flatMap(row=>row.slots.filter(slot=>(slot.state==="LEVEL UP"||slot.state==="LEVEL INVENTORY")&&!transferredSlots.has(`${slot.character}:${slot.slotId}`)&&matchesSlot(slot)));
 const visibleRows=scopedRows.map(row=>({...row,slots:row.slots.filter(slot=>slot.state!=="UNKNOWN"&&matchesSlot(slot))})).filter(row=>matches(row.character)||row.slots.length);
 const filteredNeeds=needs.map(item=>({...item,characters:item.characters.filter(character=>scopedRows.some(row=>row.character===character.name&&row.slots.some(slot=>slot.slotId===item.slotId&&slot.acquisition.some(source=>source.id===item.itemId))))})).filter(item=>item.characters.length);
 const itemGroups=equipmentTargetRarities.filter(rarity=>goalScope||selected[rarity]).map(rarity=>({rarity,items:filteredNeeds.filter(item=>tier(item.itemId)===rarity&&matches(`${item.name} ${equipmentSlotLabel(item.slotId)} ${item.characters.map(character=>character.name).join(" ")}`))})).filter(group=>group.items.length);
 const assignedSlots=new Set(rows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW").map(slot=>`${slot.character}:${slot.slotId}`)));
 const visibleTransfers=transfers.filter(item=>scopedRows.some(row=>row.character===item.recipient&&row.slots.some(slot=>slot.slotId===item.recipientSlot&&slot.acquisition.some(source=>source.id===item.itemId)))&&matches(`${item.character} ${item.recipient} ${item.itemName} ${item.replacesName} ${equipmentSlotLabel(item.slotId)} ${equipmentSlotLabel(item.recipientSlot)}`));
 const shopUpgrades=[...scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL INVENTORY"&&slot.freeCopies<=0&&!transferredSlots.has(`${slot.character}:${slot.slotId}`)&&!assignedSlots.has(`${slot.character}:${slot.slotId}`)).flatMap(slot=>slot.acquisition.filter(source=>source.offers.length).map(source=>({slot,source})))).reduce((choices,choice)=>choices.set(`${choice.slot.character}:${choice.slot.slotId}:${choice.source.id}`,choice),new Map<string,{slot:Slot;source:Source}>()).values()];
 const shoppingItems=groupEquipmentShopping(shopUpgrades).filter(item=>matches(`${item.name} ${item.members.map(({slot})=>`${slot.character} ${slot.currentItem} ${equipmentSlotLabel(slot.slotId)}`).join(" ")} ${item.offers.map(offer=>`${offer.shop} ${offer.rotation}`).join(" ")}`));
 return <>
  <div className="abilityViews"><label>Upgrade focus<select aria-label="Equipment upgrade focus" value={scope} onChange={event=>setScope(event.target.value as EquipmentScope)}><option value="raid">Main raid team</option><option value="teams">Raid first, then active War teams</option><option value="war">Active War teams</option><option value="campaign">Incomplete campaigns</option><option value="all">Full roster</option></select></label></div>
  <input className="equipmentSearch" aria-label="Search equipment upgrades" placeholder="Search character, item, slot, or shop…" value={query} onChange={event=>setQuery(event.target.value)}/>
  {scope==="raid"&&!raidNames.length?<p className="sub">Choose your <Link className="sourceLink" href="/guild-raid">main Raid team</Link> to see its equipment upgrades.</p>:null}
  <ReferenceDetails label="Equipment goals and caps"><p>{goalScope?"Raid shows useful Epic and Legendary alternatives where compatible. Gold War minimum is Epic 9; Silver War minimum is Rare 7. These are minimum goals, not downgrade instructions. Higher tiers remain alternatives, not additional required copies. Defense reserves are excluded.":"Choose target rarities for this planning view."}</p><p>Your selected Raid team gets first choice of inventory upgrades. Each copy is assigned once across the roster. Block replacements favor verified higher chance. The refinement threshold compares expected blocked damage over three hits using the equipped booster; it is general guidance, not a survival guarantee. Level-up affordability and current shop stock must be checked in-game.</p></ReferenceDetails>
  <div className="abilityViews equipmentViewTabs" aria-label="Equipment views"><button aria-pressed={view==="actions"} className={view==="actions"?"active":""} onClick={()=>setView("actions")}>Actions</button><button aria-pressed={view==="shops"} className={view==="shops"?"active":""} onClick={()=>setView("shops")}>Shop upgrades</button><button aria-pressed={view==="needed"} className={view==="needed"?"active":""} onClick={()=>setView("needed")}>Item needs</button><button aria-pressed={view==="characters"} className={view==="characters"?"active":""} onClick={()=>setView("characters")}>Characters</button></div>
  <div hidden={view!=="actions"}>
  <CollapsibleSection title="Equip now" summary={`${ready.length} upgrades ready from inventory`} className="equipmentActions">
   {ready.length?<UpgradeTable slots={ready} kind="ready"/>:<p className="sub">{query.trim()?"No inventory upgrades match this search.":"No inventory upgrades ready for this team."}</p>}
   {outsideReady>0?<button className="sourceLink" onClick={()=>setScope("all")}>{outsideReady} equip-now actions outside this focus · View full roster</button>:null}
  </CollapsibleSection>
  <GearTransferTable transfers={visibleTransfers} hideEmpty/>
  {inventoryOptions.length?<CollapsibleSection title="Inventory upgrade choices" defaultOpen={false} summary={`${inventoryOptions.length} alternatives`}><UpgradeTable slots={inventoryOptions} kind="inventory"/></CollapsibleSection>:null}
  {levelActions.length?<CollapsibleSection title="Level up gear" summary={`${levelActions.length} level goals · check coins and salvage`}><UpgradeTable slots={levelActions} kind="level"/></CollapsibleSection>:null}

  </div>
  {!goalScope?<fieldset className="equipmentRarityFilter"><legend>Target rarity</legend>{equipmentTargetRarities.map(rarity=><label key={rarity}><input type="checkbox" checked={selected[rarity]} onChange={event=>setSelected(current=>({...current,[rarity]:event.target.checked}))}/><RarityBadge rarity={rarity}/></label>)}</fieldset>:null}
  <div hidden={view!=="shops"}><section className="equipmentShopSummary" aria-label="Shop upgrade opportunities"><h2>Shopping list <small>{shoppingItems.length} item choices</small></h2><ShopShoppingList items={shoppingItems}/></section></div>
  <div hidden={view!=="needed"}><CollapsibleSection title="Needed Equipment" summary={`${itemGroups.reduce((sum,group)=>sum+group.items.length,0)} item types`}>
   {!itemGroups.length?<p className="empty">No equipment needs at these rarities.</p>:null}
   {itemGroups.map(group=><CollapsibleSection key={group.rarity} label={group.rarity} title={<RarityBadge rarity={group.rarity}/>} summary={`${group.items.length} item types`} defaultOpen={group.rarity==="Legendary"}>
    <div className="tableWrap"><table><thead><tr><th>Item</th><th>Upgrade needs</th><th>In inventory</th></tr></thead><tbody>{group.items.map(item=><tr key={`${item.slotId}:${item.itemId}`}><td><EquipmentSlot slotId={item.slotId}/><span className="itemName"><ItemIcon id={item.itemId}/><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.itemId)}`}>{item.name}</Link></span></td><td>{item.characters.length}</td><td className={item.available?"ready":"below"}>{item.available}</td></tr>)}</tbody></table></div>
   </CollapsibleSection>)}
  </CollapsibleSection></div>
  <div hidden={view!=="characters"}><CollapsibleSection title="Character equipment" summary={`${visibleRows.length} characters · expand for item and purchase details`}>
   {!visibleRows.length?<p className="empty">No characters match this search.</p>:null}
   {visibleRows.map(row=><CollapsibleSection key={row.character} title={row.character} summary={transfers.some(item=>item.recipient===row.character)?"Move gear from another character":characterSummary(row)} defaultOpen={false}>
    <p><CharacterName name={row.character} id={row.characterId}/></p>
    {row.slots.length?<div className="tableWrap"><table><thead><tr><th>Current item</th><th>Upgrade to</th><th>Next action</th></tr></thead><tbody>{row.slots.map(slot=><tr key={`${slot.slotId}:${slot.itemRarity}`}><td><EquipmentSlot slotId={slot.slotId}/><ResourceName id={slot.currentItemId??""} name={slot.currentItem}/><small><RarityBadge rarity={slot.currentRarity}/> · level {slot.currentLevel}</small></td><td><UpgradeItem slot={slot}/><small><RarityBadge rarity={slot.itemRarity}/>{slot.minimumLevel&&slot.minimumLevel>1?` · replacement needs level ${slot.minimumLevel}`:""}</small><ReferenceDetails label="Why this item"><p>{slot.reason}</p></ReferenceDetails></td><td><SlotAction slot={slot} transfer={transfers.find(item=>item.recipient===slot.character&&item.recipientSlot===slot.slotId&&slot.acquisition.some(source=>source.id===item.itemId))}/></td></tr>)}</tbody></table></div>:<p className="sub">No verified replacement at the selected goals. Open the character to review their equipped gear and compatibility.</p>}
   </CollapsibleSection>)}
  </CollapsibleSection></div>
 </>;
}
