"use client";
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
type Slot=EquipmentRow&{state:string;target:string;itemRarity:EquipmentTargetRarity;acquisition:Source[];available:number;freeCopies:number;allocatedItemId?:string;holders:Holder[];goalLabel?:string;reason?:string;minimumLevel?:number;allocatedLevel?:number;copiesToLevel?:number};
type Row={character:string;characterId?:string;rarity:string;slots:Slot[]};
type Need={slotId:string;itemId:string;name:string;available:number;priority:number;characters:Array<{name:string;id?:string;focus:string[];priority:number}>};
const assetBase="https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/assets/images/equipment/";
const tier=(id:string):EquipmentTargetRarity|"Other"=>({U:"Uncommon",R:"Rare",E:"Epic",L:"Legendary"} as const)[id.match(/_([UREL])\d{3}$/)?.[1] as "U"|"R"|"E"|"L"]??"Other";
function ItemIcon({id}:{id:string}){return <img className="itemPortrait" src={`${assetBase}ui_icon_item_${id}.png`} alt="" onError={event=>{event.currentTarget.style.visibility="hidden";}}/>;}
function UpgradeItem({slot}:{slot:Slot}){
 const source=slot.acquisition.find(source=>source.id===slot.allocatedItemId)??slot.acquisition[0];
 return <span className="itemName">{source?<ItemIcon id={source.id}/>:null}{source?<Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>{source.name}</Link>:<strong>{slot.target}</strong>}</span>;
}
function OfferInfo({offer}:{offer:EquipmentShopOffer}){return <div><strong>{offer.shop}</strong><small>{offer.rotation} · {offer.price}</small><small>{offer.match==="pool"?"Random item pool · check stock":"Catalog offer · check stock"}{offer.adRefresh?" · Ad refresh":""}{offer.access==="unknown"?" · Access unverified":""}</small></div>;}
function SlotAction({slot}:{slot:Slot}){
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
 return <div className="tableWrap"><table><thead><tr><th>Character</th><th>{kind==="ready"?"Equip this":kind==="inventory"?"Available item":"Item to level"}</th><th>{kind==="ready"?"Replace":kind==="inventory"?"Copies available":"Next goal"}</th></tr></thead><tbody>{slots.map(slot=><tr key={`${slot.character}:${slot.slotId}:${slot.itemRarity}`}><td><CharacterName name={slot.character} id={slot.characterId}/><small>{slot.goalLabel}</small></td><td>{kind==="level"?slot.state==="LEVEL INVENTORY"?<><UpgradeItem slot={slot}/><small>Inventory copy needs refinement</small></>:<>{slot.currentItem}<small>Level {slot.currentLevel}</small></>:<UpgradeItem slot={slot}/>}</td><td>{kind==="ready"?<>{slot.currentItem}<small>{slot.currentRarity} · level {slot.currentLevel}</small><strong className="ready">Upgrade now</strong></>:kind==="inventory"?slot.freeCopies:<>{slot.target}{slot.state==="LEVEL INVENTORY"?` · level ${slot.minimumLevel}`:""}<small>{slot.state==="LEVEL INVENTORY"?`Inventory replacement needs level ${slot.minimumLevel} before equipping · `:""}Check coins and salvage</small></>}</td></tr>)}</tbody></table></div>;
}
function ShopUpgradeRow({slot,source}:{slot:Slot;source:Source}){
 const offers=[...source.offers].sort((a,b)=>Number(b.match==="exact")-Number(a.match==="exact"));
 return <tr><td><CharacterName name={slot.character} id={slot.characterId}/><small>{slot.goalLabel}</small></td><td><span className="itemName"><ItemIcon id={source.id}/><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(source.id)}`}>{source.name}</Link></span><small>{slot.itemRarity} · replaces {slot.currentItem} ({slot.currentRarity})</small></td><td><strong>Buy an upgrade here</strong><OfferInfo offer={offers[0]!}/>{offers.length>1?<ReferenceDetails label={`${offers.length-1} other shop offers`}>{offers.slice(1).map(offer=><OfferInfo key={offer.id} offer={offer}/>)}</ReferenceDetails>:null}</td></tr>;
}

export default function EquipmentTable({rows,needs,raidNames,campaignNames,defenseTeams,offenseTeams}:{rows:Row[];needs:Need[];raidNames:string[];campaignNames:string[];defenseTeams:EquipmentWarTeam[];offenseTeams:EquipmentWarTeam[]})
{
 const [scope,setScope]=useState<EquipmentScope>("teams");
 const [savedPlan,setSavedPlan]=useState<unknown>(null);
 useEffect(()=>{const read=()=>{try{setSavedPlan(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedPlan(null);}};read();window.addEventListener("storage",read);return()=>window.removeEventListener("storage",read);},[]);
 const warGoals=useMemo(()=>selectedWarGearGoals(defenseTeams,offenseTeams,savedPlan),[defenseTeams,offenseTeams,savedPlan]);
 const raid=new Set(raidNames),campaign=new Set(campaignNames);
 const [selected,setSelected]=useState<Record<EquipmentTargetRarity,boolean>>({Uncommon:false,Rare:false,Epic:true,Legendary:true});
 const goalScope=scope==="teams"||scope==="raid"||scope==="war";
 const scopedRows=rows.flatMap(row=>{
  const goal=equipmentTeamGoal(row.character,row.rarity,raid,warGoals,scope);
  if(goalScope&&!goal||scope==="campaign"&&!campaign.has(row.character))return [];
  const slots=row.slots.filter(slot=>slot.state==="EQUIP NOW"||(goal?equipmentOptionFitsGoal(slot.currentRarity,slot.itemRarity,row.rarity,goal):selected[slot.itemRarity]&&["Common",...equipmentTargetRarities,"Mythic"].indexOf(slot.itemRarity)>=["Common",...equipmentTargetRarities,"Mythic"].indexOf(slot.currentRarity))).map(slot=>goal?{...slot,goalLabel:`${goal.label} · ${goal.rarity} ${goal.level}`}:slot);
  return [{...row,slots,goal}];
 }).sort((a,b)=>(b.goal?.priority??0)-(a.goal?.priority??0));
 const [view,setView]=useState<"shops"|"needed"|"characters">("shops");
 const [query,setQuery]=useState("");
 const matches=(value:string)=>value.toLowerCase().includes(query.toLowerCase().trim());
 const ready=scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW"));
 const outsideReady=rows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW")).length-ready.length;
 const inventoryOptions=scopedRows.flatMap(row=>row.slots.filter(slot=>slot.freeCopies>0&&slot.state!=="EQUIP NOW"&&slot.state!=="UNKNOWN"));
 const levelActions=scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state==="LEVEL UP"||slot.state==="LEVEL INVENTORY"));
 const visibleRows=scopedRows.map(row=>({...row,slots:row.slots.filter(slot=>slot.state!=="UNKNOWN"&&matches(`${row.character} ${slot.currentItem} ${slot.target} ${slot.acquisition.flatMap(source=>source.offers.map(offer=>offer.shop)).join(" ")}`))})).filter(row=>matches(row.character)||row.slots.length);
 const filteredNeeds=needs.map(item=>({...item,characters:item.characters.filter(character=>scopedRows.some(row=>row.character===character.name&&row.slots.some(slot=>slot.slotId===item.slotId&&slot.acquisition.some(source=>source.id===item.itemId))))})).filter(item=>item.characters.length);
 const itemGroups=equipmentTargetRarities.filter(rarity=>goalScope||selected[rarity]).map(rarity=>({rarity,items:filteredNeeds.filter(item=>tier(item.itemId)===rarity&&matches(`${item.name} ${item.characters.map(character=>character.name).join(" ")}`))})).filter(group=>group.items.length);
 const assignedSlots=new Set(rows.flatMap(row=>row.slots.filter(slot=>slot.state==="EQUIP NOW").map(slot=>`${slot.character}:${slot.slotId}`)));
 const shopUpgrades=[...scopedRows.flatMap(row=>row.slots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL INVENTORY"&&slot.freeCopies<=0&&!assignedSlots.has(`${slot.character}:${slot.slotId}`)).flatMap(slot=>slot.acquisition.filter(source=>source.offers.length&&matches(`${slot.character} ${source.name} ${source.offers.map(offer=>`${offer.shop} ${offer.rotation}`).join(" ")}`)).map(source=>({slot,source})))).reduce((choices,choice)=>choices.set(`${choice.slot.character}:${choice.source.id}`,choice),new Map<string,{slot:Slot;source:Source}>()).values()];
 return <>
  <div className="abilityViews"><label>Upgrade focus<select aria-label="Equipment upgrade focus" value={scope} onChange={event=>setScope(event.target.value as EquipmentScope)}><option value="teams">Main raid + active War teams</option><option value="raid">Main raid team</option><option value="war">Active War teams</option><option value="campaign">Incomplete campaigns</option><option value="all">Full roster · manual rarity goals</option></select></label></div>
  <ReferenceDetails label="Equipment goals and caps"><p>{goalScope?"Raid shows useful Epic and Legendary alternatives where compatible. Gold War minimum is Epic 9; Silver War minimum is Rare 7. These are minimum goals, not downgrade instructions. Higher tiers remain alternatives, not additional required copies. Defense reserves are excluded.":"Choose target rarities for this planning view."}</p><p>Inventory replacements reserve one copy per character slot across the full roster. Block replacements favor verified higher chance. The refinement threshold compares expected blocked damage over three hits using the equipped booster; it is general guidance, not a survival guarantee. Level-up affordability and current shop stock must be checked in-game.</p></ReferenceDetails>
  <CollapsibleSection title="Equip now" summary={`${ready.length} upgrades ready from inventory`} className="equipmentActions">
   {ready.length?<UpgradeTable slots={ready} kind="ready"/>:<p className="sub">No confirmed equipment allocations ready for this focus.</p>}
   {outsideReady>0?<button className="sourceLink" onClick={()=>setScope("all")}>{outsideReady} equip-now actions outside this focus · View full roster</button>:null}
  </CollapsibleSection>
  {inventoryOptions.length?<CollapsibleSection title="Inventory upgrade choices" summary={`${inventoryOptions.length} alternatives · shared copies, confirmed allocations deducted`}><UpgradeTable slots={inventoryOptions} kind="inventory"/></CollapsibleSection>:null}
  {levelActions.length?<CollapsibleSection title="Level up equipped gear" summary={`${levelActions.length} level goals · check coins and salvage`}><UpgradeTable slots={levelActions} kind="level"/></CollapsibleSection>:null}
  <div className="abilityViews"><button className={view==="shops"?"active":""} onClick={()=>setView("shops")}>Shop upgrades</button><button className={view==="needed"?"active":""} onClick={()=>setView("needed")}>Needed Equipment</button><button className={view==="characters"?"active":""} onClick={()=>setView("characters")}>Characters</button></div>
  {!goalScope?<fieldset className="equipmentRarityFilter"><legend>Target rarity</legend>{equipmentTargetRarities.map(rarity=><label key={rarity}><input type="checkbox" checked={selected[rarity]} onChange={event=>setSelected(current=>({...current,[rarity]:event.target.checked}))}/>{rarity}</label>)}</fieldset>:null}
  <input className="equipmentSearch" aria-label="Search equipment upgrades" placeholder="Search character, item, or shop…" value={query} onChange={event=>setQuery(event.target.value)}/>
  <div hidden={view!=="shops"}><CollapsibleSection title="Shop upgrade opportunities" summary={`${shopUpgrades.length} options · check current stock in-game`}>
   <p className="sub equipmentShopNote">Schedules use UTC · check current stock in-game.</p>
   {shopUpgrades.length?<div className="tableWrap"><table><thead><tr><th>Character</th><th>Upgrade</th><th>Where and when</th></tr></thead><tbody>{shopUpgrades.map(choice=><ShopUpgradeRow key={`${choice.slot.character}:${choice.source.id}`} {...choice}/>)}</tbody></table></div>:<p className="empty">No matching shop offers at these rarities.</p>}
  </CollapsibleSection></div>
  <div hidden={view!=="needed"}><CollapsibleSection title="Needed Equipment" summary={`${itemGroups.reduce((sum,group)=>sum+group.items.length,0)} item types · alternatives are not additive requirements`}>
   {!itemGroups.length?<p className="empty">No equipment needs at these rarities.</p>:null}
   {itemGroups.map(group=><CollapsibleSection key={group.rarity} title={group.rarity} summary={`${group.items.length} item types`} defaultOpen={group.rarity==="Legendary"}>
    <div className="tableWrap"><table><thead><tr><th>Item</th><th>Upgrade needs</th><th>In inventory</th></tr></thead><tbody>{group.items.map(item=><tr key={`${item.slotId}:${item.itemId}`}><td><span className="itemName"><ItemIcon id={item.itemId}/><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.itemId)}`}>{item.name}</Link></span></td><td>{item.characters.length}</td><td className={item.available?"ready":"below"}>{item.available}</td></tr>)}</tbody></table></div>
   </CollapsibleSection>)}
  </CollapsibleSection></div>
  <div hidden={view!=="characters"}><CollapsibleSection title="Character equipment" summary={`${visibleRows.length} characters · expand for item and purchase details`}>
   {!visibleRows.length?<p className="empty">No characters match this search.</p>:null}
   {visibleRows.map(row=><CollapsibleSection key={row.character} title={row.character} summary={characterSummary(row)} defaultOpen={false}>
    <p><CharacterName name={row.character} id={row.characterId}/></p>
    {row.slots.length?<div className="tableWrap"><table><thead><tr><th>Current item</th><th>Upgrade to</th><th>Next action</th></tr></thead><tbody>{row.slots.map(slot=><tr key={`${slot.slotId}:${slot.itemRarity}`}><td>{slot.currentItem}<small>{slot.currentRarity} · level {slot.currentLevel}</small></td><td><UpgradeItem slot={slot}/><small>{slot.itemRarity}{slot.minimumLevel&&slot.minimumLevel>1?` · replacement needs level ${slot.minimumLevel}`:""}</small><small>{slot.reason}</small></td><td><SlotAction slot={slot}/>{slot.holders.length?<ReferenceDetails label="Equipped copies · review before moving">{slot.holders.map(holder=><p key={`${holder.characterId}:${holder.slotId}`}><Link className="sourceLink" href={`/characters/${holder.characterId}`}>{holder.character}</Link><small>Level {holder.level}</small></p>)}</ReferenceDetails>:null}</td></tr>)}</tbody></table></div>:<p className="sub">No verified replacement at the selected goals. Open the character to review their equipped gear and compatibility.</p>}
   </CollapsibleSection>)}
  </CollapsibleSection></div>
 </>;
}
