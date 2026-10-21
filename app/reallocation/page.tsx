import {readFile} from "node:fs/promises";
import Nav from "../components/Nav";
import {getCharacterCatalog} from "../lib/catalog";
import {getReport} from "../lib/report";
import {getShopCatalog} from "../lib/shops";
import {getAccountEquipmentPlan} from "../lib/accountEquipmentPlan";
import {getRaidMeta} from "../lib/raidSelection";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition} from "../../src/domain/campaigns";
import {buildDistinctDefenseTeams,type DefenseCore} from "../../src/domain/warTeams";
import type {EquipmentFocus} from "../../src/domain/equipmentFocus";
import type {EquipmentDefinition} from "../../src/domain/equipmentCompatibility";
import ReallocationPlanner from "./ReallocationPlanner";

export default async function ReallocationPage(){
 const [report,catalog,shops,meta,focus,battleText,defensePlan,offensePlan]=await Promise.all([
  getReport(),getCharacterCatalog(),getShopCatalog(),getRaidMeta(),
  readFile("config/character_priorities.json","utf8").then(text=>JSON.parse(text) as Record<string,EquipmentFocus>),
  readFile("data/game/campaign-battles.json","utf8"),
  readFile("config/war_defense_teams.json","utf8").then(text=>JSON.parse(text) as {teams:DefenseCore[]}),
  readFile("config/war_offense_teams.json","utf8").then(text=>JSON.parse(text) as {validatedFullLineups:Array<{name:string;members:string[];used:number;wins:number}>})
 ]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const plan=await getAccountEquipmentPlan(report,catalog,shops);
 const owned=new Set(report.roster.map(unit=>unit.name));
 const defenseTeams=buildDistinctDefenseTeams(defensePlan.teams,owned).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const offenseTeams=offensePlan.validatedFullLineups.filter(team=>team.members.every(name=>owned.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const raidOptions=[...new Set(Object.values(meta.bosses).flatMap(teams=>Object.values(teams).flatMap(team=>[...team.core,...team.flex].filter(name=>!team.excluded?.includes(name)))))];
 const battles=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
 const campaignNames:string[]=[],campaignUnknown:string[]=[];
 for(const character of catalog.characters){
  for(const name of character.campaignsRequiredIn){
   const progress=(report.campaignProgress??[]).filter(campaign=>requiredCampaignName(campaign)===name);
   if(!progress.length)campaignUnknown.push(character.name);
   else if(progress.some(campaign=>!campaignIsComplete(campaign,battles)))campaignNames.push(character.name);
  }
 }
 const covered=new Set(plan.tieredSlots.filter(slot=>slot.state==="EQUIP NOW").map(slot=>`${slot.characterId}:${slot.slotId}`));
 const targets=plan.tieredSlots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL UP"&&slot.itemRarity==="Legendary").flatMap(slot=>slot.characterId?slot.acquisition.map(source=>({character:slot.character,characterId:slot.characterId!,slotId:slot.slotId,itemId:source.id,minimumLevel:slot.minimumLevel,inventoryReady:covered.has(`${slot.characterId}:${slot.slotId}`)||slot.freeCopies>0})):[]);
 // The browser needs restrictions and names, not the full per-level stat tables.
 const equipment=Object.fromEntries(Object.entries(plan.catalogEquipment).map(([id,item])=>[id,{type:item.type,rarity:item.rarity,...(item.name?{name:item.name}:{}),...(item.allowedUnits?{allowedUnits:item.allowedUnits}:{}),...(item.allowedFactions?{allowedFactions:item.allowedFactions}:{})}])) as Record<string,EquipmentDefinition>;
 return <main><Nav/><header><div><p className="eyebrow">LEGENDARY GEAR</p><h1>Gear transfers</h1><p className="sub">Find a better home for spare gear while protecting your active teams.</p></div></header>{!shops?<div className="empty">Equipment catalog unavailable. Keep gear equipped until compatibility can be checked.</div>:<ReallocationPlanner units={report.roster} targets={targets} characters={catalog.characters.map(character=>({id:character.id,name:character.name,faction:character.faction,equipment:character.equipment}))} equipment={equipment} raidNames={plan.raidNames} raidOptions={raidOptions} campaignNames={campaignNames} campaignUnknown={campaignUnknown} focus={focus} defenseTeams={defenseTeams} offenseTeams={offenseTeams}/>}</main>;
}
