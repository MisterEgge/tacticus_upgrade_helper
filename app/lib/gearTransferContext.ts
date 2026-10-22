import {getAccountWarDefense} from "./warDefensePlan";
import {readFile} from "node:fs/promises";
import {getCharacterCatalog,getAbilityBreakpoints} from "../lib/catalog";
import {gearRoleFocus} from "../../src/domain/gearRoleFocus";
import {getReport} from "../lib/report";
import {getShopCatalog} from "../lib/shops";
import {getAccountEquipmentPlan} from "../lib/accountEquipmentPlan";
import {getRaidMeta} from "../lib/raidSelection";
import {campaignGearProtection} from "../../src/domain/campaignGearProtection";
import type {CampaignBattleDefinition} from "../../src/domain/campaigns";
import type {EquipmentFocus} from "../../src/domain/equipmentFocus";
import type {EquipmentDefinition} from "../../src/domain/equipmentCompatibility";
import {equipmentStatsAtLevel} from "../../src/domain/equipmentCompatibility";
import {minimumBlockReplacementLevel} from "../../src/domain/blockEquipment";
import type {ReallocationProps} from "../reallocation/ReallocationPlanner";
import type {Report} from "./report";

export async function getGearTransferContext(account?:{report:Report;catalog:Awaited<ReturnType<typeof getCharacterCatalog>>;shops:Awaited<ReturnType<typeof getShopCatalog>>;plan:Awaited<ReturnType<typeof getAccountEquipmentPlan>>}){
 const [report,catalog,shops,meta,focus,battleText,offensePlan,guidance]=await Promise.all([
  account?.report??getReport(),account?.catalog??getCharacterCatalog(),account?account.shops:getShopCatalog(),getRaidMeta(),
  readFile("config/character_priorities.json","utf8").then(text=>JSON.parse(text) as Record<string,EquipmentFocus>),
  readFile("data/game/campaign-battles.json","utf8"),
  readFile("config/war_offense_teams.json","utf8").then(text=>JSON.parse(text) as {validatedFullLineups:Array<{name:string;members:string[];used:number;wins:number}>}),getAbilityBreakpoints()
 ]);
 if(!report)return null;
 const plan=account?.plan??await getAccountEquipmentPlan(report,catalog,shops);
 const owned=new Set(report.roster.map(unit=>unit.name));
 const defenseTeams=getAccountWarDefense(report).map(team=>({name:team.name,used:team.used,tier:team.tier,members:team.members.map(name=>({name}))}));
 const offenseTeams=offensePlan.validatedFullLineups.filter(team=>team.members.every(name=>owned.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const raidOptions=[...new Set(Object.values(meta.bosses).flatMap(teams=>Object.values(teams).flatMap(team=>[...team.core,...team.flex].filter(name=>!team.excluded?.includes(name)))))];
 const battles=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
 const {campaignNames,campaignUnknown}=campaignGearProtection(catalog.characters,report.campaignProgress??[],battles);
 const protectedFocus=gearRoleFocus(focus,guidance);
 const covered=new Set(plan.tieredSlots.filter(slot=>slot.state==="EQUIP NOW").map(slot=>`${slot.characterId}:${slot.slotId}`));
 const targets=plan.tieredSlots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL UP").flatMap(slot=>slot.characterId?slot.acquisition.flatMap(source=>{
  const unit=plan.unitByName.get(slot.character),current=unit?.items.find(item=>item.slotId===slot.slotId);
  const booster=unit?.items.find(item=>plan.catalogEquipment[item.id]?.type==="I_Booster_Block");
  const bonus=booster?equipmentStatsAtLevel(plan.catalogEquipment[booster.id],booster.level):null;
  // Alternatives can require different refinement levels; verify the actual proposed item.
  const minimumLevel=current&&plan.catalogEquipment[current.id]?.type==="I_Block"&&current.id!==source.id?(booster&&!bonus?null:minimumBlockReplacementLevel(current,source.id,plan.catalogEquipment,{chance:bonus?.blockChanceBonus??0,damage:bonus?.blockDamageBonus??0})):slot.minimumLevel;
  return minimumLevel===null?[]:[{character:slot.character,characterId:slot.characterId!,slotId:slot.slotId,itemId:source.id,minimumLevel,inventoryReady:covered.has(`${slot.characterId}:${slot.slotId}`)||slot.freeCopies>0}];
 }):[]);
 // The browser needs restrictions and names, not the full per-level stat tables.
 const equipment=Object.fromEntries(Object.entries(plan.catalogEquipment).map(([id,item])=>[id,{type:item.type,rarity:item.rarity,...(item.name?{name:item.name}:{}),...(item.allowedUnits?{allowedUnits:item.allowedUnits}:{}),...(item.allowedFactions?{allowedFactions:item.allowedFactions}:{})}])) as Record<string,EquipmentDefinition>;
 return {units:report.roster,targets,characters:catalog.characters.map(character=>({id:character.id,name:character.name,faction:plan.unitByName.get(character.name)?.faction??character.faction,equipment:character.equipment})),equipment,raidNames:plan.raidNames,raidOptions,campaignNames,campaignUnknown,focus:protectedFocus,defenseTeams,offenseTeams} satisfies ReallocationProps;
}
