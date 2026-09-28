import Link from "next/link";
import {getShopCatalog}from "../lib/shops";
import {getCharacterCatalog}from "../lib/catalog";
import {readFile}from "node:fs/promises";
import {sourcesForItem}from "../../src/domain/shops";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition}from "../../src/domain/campaigns";
import {equipmentFocusLabels,equipmentFocusPriority,type EquipmentFocus}from "../../src/domain/equipmentFocus";
import {equipmentTargetRarities,tierUpgradeItemId}from "../../src/domain/equipmentTier";
import Nav from "../components/Nav";
import {getReport,targetName}from "../lib/report";
import EquipmentTable from "./EquipmentTable";

export default async function Equipment()
{
 const[report,shops,catalog,focus,battleText]=await Promise.all([getReport(),getShopCatalog(),getCharacterCatalog(),readFile("config/character_priorities.json","utf8").then(value=>JSON.parse(value)as Record<string,EquipmentFocus>),readFile("data/game/campaign-battles.json","utf8")]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const inventory=new Map<string,number>();for(const item of report.unequippedInventory)inventory.set(item.id,(inventory.get(item.id)??0)+item.amount);
 const all=[...report.equipmentAllocation.equipNow.map(row=>({...row,state:"EQUIP NOW",target:targetName(row)})),...report.equipmentAllocation.buyWatch.map(row=>({...row,state:"NEED",target:targetName(row)})),...report.equipmentAllocation.compatibilityUnknown.map(row=>({...row,state:"UNKNOWN",target:targetName(row)}))];
 const slots=all.map(row=>
 {
   const ids=[...new Set(row.recommendedItemId?[row.recommendedItemId]:row.preferredLegendaryItemIds??[])];
   return {...row,itemRarity:"Legendary" as const,acquisition:ids.map(id=>({id,name:shops?.equipment[id]?.name??id,shops:shops?sourcesForItem(id,shops):[]})),available:ids.reduce((total,id)=>total+(inventory.get(id)??0),0),holders:report.roster.flatMap(unit=>unit.items.filter(item=>ids.includes(item.id)&&unit.name!==row.character).map(item=>({character:unit.name,characterId:unit.id,slotId:item.slotId,level:item.level})))};
 });
 const catalogEquipment=shops?.equipment??{};
 const genericSlots=report.roster.flatMap(unit=>unit.items.flatMap(item=>equipmentTargetRarities.flatMap(itemRarity=>
 {
   const id=tierUpgradeItemId(item.rarity??"",item.id,itemRarity,catalogEquipment);
   if(!id)return [];
   const available=inventory.get(id)??0;
   return [{character:unit.name,characterId:unit.id,slotId:item.slotId,currentItem:item.name??item.id,currentRarity:item.rarity??"Unknown",currentLevel:item.level,accountPriority:0,itemRarity,target:catalogEquipment[id]!.name,state:available?"IN INVENTORY · allocation not assigned":"NEED",acquisition:[{id,name:catalogEquipment[id]!.name,shops:shops?sourcesForItem(id,shops):[]}],available,holders:report.roster.flatMap(holder=>holder.items.filter(held=>held.id===id&&holder.id!==unit.id).map(held=>({character:holder.name,characterId:holder.id,slotId:held.slotId,level:held.level})))}];
 })));
 const tieredSlots=[...slots,...genericSlots.filter(option=>!slots.some(slot=>slot.characterId===option.characterId&&slot.slotId===option.slotId&&slot.itemRarity===option.itemRarity))];
 const rows=[...tieredSlots.reduce<Map<string,{character:string;characterId?:string;slots:typeof tieredSlots}>>((groups,slot)=>{let row=groups.get(slot.character);if(!row){row={character:slot.character,slots:[]};if(slot.characterId)row.characterId=slot.characterId;groups.set(slot.character,row);}row.slots.push(slot);return groups;},new Map()).values()].sort((a,b)=>a.character.localeCompare(b.character));
 const battles=Object.values(JSON.parse(battleText))as CampaignBattleDefinition[];
 const incomplete=new Set((report.campaignProgress??[]).filter(progress=>!campaignIsComplete(progress,battles)).map(requiredCampaignName));
 const campaignRequired=new Set(catalog.characters.filter(character=>character.campaignsRequiredIn.some(name=>incomplete.has(name))).map(character=>character.name));
 const candidates=tieredSlots.filter(slot=>slot.state!=="UNKNOWN").flatMap(slot=>slot.acquisition.map(source=>({slotId:slot.slotId,itemId:source.id,character:slot.character,characterId:slot.characterId,focus:equipmentFocusLabels(slot.character,focus,campaignRequired),priority:equipmentFocusPriority(slot.character,focus,campaignRequired)})));
 const needs=[...candidates.reduce<Map<string,{slotId:string;itemId:string;name:string;available:number;priority:number;characters:Array<{name:string;id?:string;focus:string[];priority:number}>}>>((groups,candidate)=>{const key=`${candidate.slotId}:${candidate.itemId}`,existing=groups.get(key)??{slotId:candidate.slotId,itemId:candidate.itemId,name:shops?.equipment[candidate.itemId]?.name??candidate.itemId,available:inventory.get(candidate.itemId)??0,priority:0,characters:[]};existing.characters.push({name:candidate.character,...(candidate.characterId?{id:candidate.characterId}:{}),focus:candidate.focus,priority:candidate.priority});existing.priority=Math.max(existing.priority,candidate.priority);groups.set(key,existing);return groups;},new Map()).values()].sort((a,b)=>b.priority-a.priority||a.itemId.localeCompare(b.itemId));
 const catalogByName=new Map(catalog.characters.map(character=>[character.name,character]));
 const defensiveAudit=report.roster.flatMap(unit=>
 {
   const character=catalogByName.get(unit.name);
   if(!character?.equipment.includes("I_Defensive"))return [];
   const item=unit.items.find(item=>item.slotId==="Slot2");
   return [{name:unit.name,status:!item?"MISSING":item.id.startsWith("I_Defensive_")?"CORRECT":"MISMATCH",itemId:item?.id}];
 });
 const defensiveIssues=defensiveAudit.filter(row=>row.status!=="CORRECT");
 const defensiveCorrect=defensiveAudit.length-defensiveIssues.length;
 return <main><Nav/><header><div><p className="eyebrow">EQUIPMENT</p><h1>Character Upgrade Queue</h1><p className="sub">Choose the target rarity to focus the Needed Equipment and Characters views. Multiple rarities show alternative goals for a slot; they are not all required purchases. The summary cards show overall account totals.</p><p className="sub">Each recipient is labelled when it supports Guild Raid, Guild War, or an incomplete campaign. Unlabelled work remains a long-term target rather than being presented as urgent.</p><p className="sub">The Slot 2 audit checks every owned character that can equip health + armor. Block-only characters are deliberately excluded: they cannot equip that item type.</p><p><Link className="sourceLink" href="/sources?item=">Shop catalogs, rotations and refresh tracking</Link></p></div><div className="power">{needs.length}<strong> total needed item options</strong></div></header><section className="cards compact equipmentCards"><div className="card"><strong>{report.equipmentAllocation.equipNow.length}</strong><span>Equip now</span></div><div className="card"><strong>{report.equipmentAllocation.buyWatch.length}</strong><span>Need to acquire</span></div><div className="card"><strong>{report.equipmentAllocation.compatibilityUnknown.length}</strong><span>Needs compatibility review</span></div><div className="card"><strong className={defensiveIssues.length?"below":"ready"}>{defensiveCorrect}/{defensiveAudit.length}</strong><span>health + armor Slot 2</span><small>{defensiveIssues.length?defensiveIssues.map(row=>row.name).join(" · "):"Every eligible character has the correct item type"}</small></div></section><section className="panel detailPanel"><EquipmentTable rows={rows} needs={needs}/></section></main>;
}
