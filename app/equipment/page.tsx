import {buildEquipmentPlan} from "../lib/equipmentPlan";
import Link from "next/link";
import {getShopCatalog}from "../lib/shops";
import {getCharacterCatalog}from "../lib/catalog";
import {readFile}from "node:fs/promises";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition}from "../../src/domain/campaigns";
import {equipmentFocusLabels,equipmentFocusPriority,type EquipmentFocus}from "../../src/domain/equipmentFocus";
import {getMainRaidSelection,getRaidMeta} from "../lib/raidSelection";
import {buildDistinctDefenseTeams,type DefenseCore} from "../../src/domain/warTeams";
import Nav from "../components/Nav";
import {getReport}from "../lib/report";
import EquipmentTable from "./EquipmentTable";

export default async function Equipment()
{
 const[report,shops,catalog,focus,battleText,raidMeta,defensePlan,offensePlan]=await Promise.all([getReport(),getShopCatalog(),getCharacterCatalog(),readFile("config/character_priorities.json","utf8").then(value=>JSON.parse(value)as Record<string,EquipmentFocus>),readFile("data/game/campaign-battles.json","utf8"),getRaidMeta(),readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<{teams:DefenseCore[]}>,readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<{validatedFullLineups:Array<{name:string;members:string[];used:number;wins:number}>}>]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const {rows,tieredSlots,catalogEquipment,unitByName,catalogByName,inventory}=buildEquipmentPlan(report,catalog,shops);
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
