import Link from "next/link";
import {getShopCatalog}from "../lib/shops";
import {getCharacterCatalog}from "../lib/catalog";
import {readFile}from "node:fs/promises";
import {sourcesForItem,equipmentOffersForItem}from "../../src/domain/shops";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition}from "../../src/domain/campaigns";
import {equipmentFocusLabels,equipmentFocusPriority,type EquipmentFocus}from "../../src/domain/equipmentFocus";
import {equipmentTargetRarities,tierUpgradeItemId}from "../../src/domain/equipmentTier";
import {getMainRaidSelection,getRaidMeta} from "../lib/raidSelection";
import {buildDistinctDefenseTeams,type DefenseCore} from "../../src/domain/warTeams";
import {preferredDefensiveItemId} from "../../src/domain/equipmentGoals";
import Nav from "../components/Nav";
import {getReport,targetName}from "../lib/report";
import EquipmentTable from "./EquipmentTable";

export default async function Equipment()
{
 const[report,shops,catalog,focus,battleText,raidMeta,defensePlan,offensePlan]=await Promise.all([getReport(),getShopCatalog(),getCharacterCatalog(),readFile("config/character_priorities.json","utf8").then(value=>JSON.parse(value)as Record<string,EquipmentFocus>),readFile("data/game/campaign-battles.json","utf8"),getRaidMeta(),readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<{teams:DefenseCore[]}>,readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<{validatedFullLineups:Array<{name:string;members:string[];used:number;wins:number}>}>]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const unitByName=new Map(report.roster.map(unit=>[unit.name,unit]));
 const catalogByName=new Map(catalog.characters.map(character=>[character.name,character]));
 const preferred=(name:string,rarity:string,currentId:string)=>{const unit=unitByName.get(name),character=catalogByName.get(name);return unit&&character&&shops?preferredDefensiveItemId(unit,character.traits,character.equipment,rarity,currentId,shops.equipment):null;};
 const inventory=new Map<string,number>();for(const item of report.unequippedInventory)inventory.set(item.id,(inventory.get(item.id)??0)+item.amount);
 const all=[...report.equipmentAllocation.equipNow.map(row=>({...row,state:"EQUIP NOW",target:targetName(row)})),...report.equipmentAllocation.buyWatch.map(row=>({...row,state:"NEED",target:targetName(row)})),...report.equipmentAllocation.compatibilityUnknown.map(row=>({...row,state:"UNKNOWN",target:targetName(row)}))];
 const slots=all.map(row=>
 {
   const current=unitByName.get(row.character)?.items.find(item=>item.slotId===row.slotId);
   const better=row.slotId==="Slot2"&&current?preferred(row.character,"Legendary",current.id):null;
   const ids=better?[better]:[...new Set(row.recommendedItemId?[row.recommendedItemId]:row.preferredLegendaryItemIds??[])];
   const changed=better&&row.recommendedItemId!==better;
   return {...row,...(better?{target:shops!.equipment[better]!.name}:{}),...(changed&&row.state==="EQUIP NOW"?{state:inventory.get(better!)?"IN INVENTORY · allocation not assigned":"NEED"}:{}),itemRarity:"Legendary" as const,acquisition:ids.map(id=>({id,name:shops?.equipment[id]?.name??id,shops:shops?sourcesForItem(id,shops):[],offers:shops?equipmentOffersForItem(id,shops,report.source.powerLevel):[]})),available:ids.reduce((total,id)=>total+(inventory.get(id)??0),0),holders:report.roster.flatMap(unit=>unit.items.filter(item=>ids.includes(item.id)&&unit.name!==row.character).map(item=>({character:unit.name,characterId:unit.id,slotId:item.slotId,level:item.level})))};
 });
 const catalogEquipment=shops?.equipment??{};
 const genericSlots=report.roster.flatMap(unit=>unit.items.flatMap(item=>equipmentTargetRarities.flatMap(itemRarity=>
 {
   const bestType=item.slotId==="Slot2"?preferred(unit.name,itemRarity,item.id):null;
   const id=bestType??tierUpgradeItemId(item.rarity??"",item.id,itemRarity,catalogEquipment);
   if(!id)return [];
   const available=inventory.get(id)??0;
   return [{character:unit.name,characterId:unit.id,slotId:item.slotId,currentItem:item.name??item.id,currentRarity:item.rarity??"Unknown",currentLevel:item.level,accountPriority:0,itemRarity,reason:bestType?"Preferred health + armor":"Rarity upgrade",target:catalogEquipment[id]!.name,state:available?"IN INVENTORY · allocation not assigned":"NEED",acquisition:[{id,name:catalogEquipment[id]!.name,shops:shops?sourcesForItem(id,shops):[],offers:shops?equipmentOffersForItem(id,shops,report.source.powerLevel):[]}],available,holders:report.roster.flatMap(holder=>holder.items.filter(held=>held.id===id&&holder.id!==unit.id).map(held=>({character:holder.name,characterId:holder.id,slotId:held.slotId,level:held.level})))}];
 })));
 const levelSlots=report.roster.flatMap(unit=>unit.items.flatMap(item=>[{rarity:"Rare" as const,level:7},{rarity:"Epic" as const,level:9}].flatMap(goal=>item.rarity===goal.rarity&&item.level<goal.level&&!preferred(unit.name,goal.rarity,item.id)?[{character:unit.name,characterId:unit.id,slotId:item.slotId,currentItem:item.name??item.id,currentRarity:item.rarity,currentLevel:item.level,accountPriority:0,itemRarity:goal.rarity,target:`${item.name??item.id} · level ${goal.level}`,state:"LEVEL UP",acquisition:[],available:0,holders:[]}]:[])));
 const tieredSlots=[...slots,...levelSlots,...genericSlots.filter(option=>!slots.some(slot=>slot.characterId===option.characterId&&slot.slotId===option.slotId&&slot.itemRarity===option.itemRarity))];
 const rows=[...tieredSlots.reduce<Map<string,{character:string;characterId?:string;slots:typeof tieredSlots}>>((groups,slot)=>{let row=groups.get(slot.character);if(!row){row={character:slot.character,slots:[]};if(slot.characterId)row.characterId=slot.characterId;groups.set(slot.character,row);}row.slots.push(slot);return groups;},new Map()).values()].sort((a,b)=>a.character.localeCompare(b.character));
 const battles=Object.values(JSON.parse(battleText))as CampaignBattleDefinition[];
 const incomplete=new Set((report.campaignProgress??[]).filter(progress=>!campaignIsComplete(progress,battles)).map(requiredCampaignName));
 const campaignRequired=new Set(catalog.characters.filter(character=>character.campaignsRequiredIn.some(name=>incomplete.has(name))).map(character=>character.name));
 const candidates=tieredSlots.filter(slot=>slot.state!=="UNKNOWN").flatMap(slot=>slot.acquisition.map(source=>({slotId:slot.slotId,itemId:source.id,character:slot.character,characterId:slot.characterId,focus:equipmentFocusLabels(slot.character,focus,campaignRequired),priority:equipmentFocusPriority(slot.character,focus,campaignRequired)})));
 const needs=[...candidates.reduce<Map<string,{slotId:string;itemId:string;name:string;available:number;priority:number;characters:Array<{name:string;id?:string;focus:string[];priority:number}>}>>((groups,candidate)=>{const key=`${candidate.slotId}:${candidate.itemId}`,existing=groups.get(key)??{slotId:candidate.slotId,itemId:candidate.itemId,name:shops?.equipment[candidate.itemId]?.name??candidate.itemId,available:inventory.get(candidate.itemId)??0,priority:0,characters:[]};existing.characters.push({name:candidate.character,...(candidate.characterId?{id:candidate.characterId}:{}),focus:candidate.focus,priority:candidate.priority});existing.priority=Math.max(existing.priority,candidate.priority);groups.set(key,existing);return groups;},new Map()).values()].sort((a,b)=>b.priority-a.priority||a.itemId.localeCompare(b.itemId));
 const defensiveAudit=report.roster.flatMap(unit=>
 {
   const character=catalogByName.get(unit.name);
   if(!character?.equipment.includes("I_Defensive")||character.traits.includes("MkXGravis"))return [];
   const item=unit.items.find(item=>item.slotId==="Slot2");
   const stats=item?catalogEquipment[item.id]?.baseStats:undefined;
   return [{name:unit.name,status:!item?"MISSING":!stats?"UNKNOWN":stats.hp&&stats.armor?"CORRECT":"MISMATCH",itemId:item?.id}];
 });
 const defensiveIssues=defensiveAudit.filter(row=>row.status!=="CORRECT");
 const defensiveCorrect=defensiveAudit.length-defensiveIssues.length;
 rows.sort((a,b)=>equipmentFocusPriority(b.character,focus,campaignRequired)-equipmentFocusPriority(a.character,focus,campaignRequired)||a.character.localeCompare(b.character));
 const selection=await getMainRaidSelection(raidMeta.bosses,report);
 const raidTeam=raidMeta.bosses[selection.boss]![selection.teamName]!;
 const raidNames=[...raidTeam.core,...selection.flex];
 const owned=new Set(report.roster.map(unit=>unit.name));
 const defenseTeams=buildDistinctDefenseTeams(defensePlan.teams,owned).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const offenseTeams=offensePlan.validatedFullLineups.filter(team=>team.members.every(name=>owned.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const goalRows=rows.map(row=>({...row,rarity:unitByName.get(row.character)?.rarity??"Unknown"}));
 return <main><Nav/><header><div><p className="eyebrow">EQUIPMENT</p><h1>Equipment upgrades</h1><p className="sub">Equip from inventory, find shop upgrades, or review a character.</p></div></header><section className="panel detailPanel equipmentPanel"><EquipmentTable rows={goalRows} needs={needs} raidNames={raidNames} campaignNames={[...campaignRequired]} defenseTeams={defenseTeams} offenseTeams={offenseTeams}/></section><details className="equipmentAudit"><summary>Equipment checks · {defensiveIssues.length} health + armor checks needed · {report.equipmentAllocation.compatibilityUnknown.length} compatibility reviews</summary><p>{defensiveCorrect}/{defensiveAudit.length} eligible characters have health + armor equipment.</p>{defensiveIssues.length?<p>{defensiveIssues.map(row=>row.name).join(" · ")}</p>:null}{report.equipmentAllocation.compatibilityUnknown.length?<p>Compatibility needs review: {[...new Set(report.equipmentAllocation.compatibilityUnknown.map(row=>row.character))].join(" · ")}</p>:null}<Link className="sourceLink" href="/sources">Shop catalogs and stock tracking</Link></details></main>;
}
