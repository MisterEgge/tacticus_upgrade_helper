import {getWarLineups,type FullLineup} from "./warLineups";
import {readFile} from "node:fs/promises";
import {getCharacterCatalog,getAbilityBreakpoints} from "../lib/catalog";
import {gearRoleFocus} from "../../src/domain/gearRoleFocus";
import {getReport} from "../lib/report";
import {getShopCatalog} from "../lib/shops";
import {getAccountEquipmentPlan} from "../lib/accountEquipmentPlan";
import {getRaidMeta} from "../lib/raidSelection";
import {campaignGearProtection,campaignHelperProtection} from "../../src/domain/campaignGearProtection";
import type {CampaignBattleDefinition} from "../../src/domain/campaigns";
import type {EquipmentFocus} from "../../src/domain/equipmentFocus";
import type {EquipmentDefinition} from "../../src/domain/equipmentCompatibility";
import {equipmentReplacementMinimumLevel} from "../../src/domain/equipmentOptions";
import type {ReallocationProps} from "../reallocation/ReallocationPlanner";
import type {Report} from "./report";

export async function getGearTransferContext(account?:{report:Report;catalog:Awaited<ReturnType<typeof getCharacterCatalog>>;shops:Awaited<ReturnType<typeof getShopCatalog>>;plan:Awaited<ReturnType<typeof getAccountEquipmentPlan>>}){
 const [report,catalog,shops,meta,focus,battleText,guidance]=await Promise.all([
  account?.report??getReport(),account?.catalog??getCharacterCatalog(),account?account.shops:getShopCatalog(),getRaidMeta(),
  readFile("config/character_priorities.json","utf8").then(text=>JSON.parse(text) as Record<string,EquipmentFocus>),
  readFile("data/game/campaign-battles.json","utf8"),
  getAbilityBreakpoints()
 ]);
 if(!report)return null;
 const plan=account?.plan??await getAccountEquipmentPlan(report,catalog,shops);
 const lineups=await getWarLineups(report,catalog);
 const unitsById=new Map(report.roster.map(unit=>[unit.id,unit]));
 const gearTeam=(team:FullLineup)=>{
  const unitFor=(value:string)=>plan.unitByName.get(value)??unitsById.get(value);
  return {name:team.name,used:team.used,priority:team.priority??0,core:team.core??[],members:team.members.flatMap(name=>{const unit=unitFor(name);return unit?[{id:unit.id,name:unit.name}]:[];}),
   flex:(team.flex??[]).flatMap(choice=>{const unit=unitFor(choice.id??choice.name??"");return unit?[{id:unit.id,name:unit.name}]:[];})};
 };
 const defenseTeams=lineups.defense.map(team=>({...gearTeam(team),tier:team.tier,slot:team.slot,rosterBuilt:"reasons" in team}));
 const offenseTeams=lineups.offense.map(gearTeam);
 const raidOptions=[...new Set(Object.values(meta.bosses).flatMap(teams=>Object.values(teams).flatMap(team=>[...team.core,...team.flex].filter(name=>!team.excluded?.includes(name)))))];
 const battles=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
 const {campaignNames,campaignUnknown}=campaignGearProtection(catalog.characters,report.campaignProgress??[],battles);
 const helpers=campaignHelperProtection(catalog.characters,report.campaignProgress??[],battles,focus);
 const campaignHelpers=[...new Set([...helpers.campaignNames,...helpers.campaignUnknown])].filter(name=>!campaignNames.includes(name)&&!campaignUnknown.includes(name));
 const protectedFocus=gearRoleFocus(focus,guidance);
 const targets=plan.tieredSlots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL UP").flatMap(slot=>slot.characterId?slot.acquisition.flatMap(source=>{
  const unit=plan.unitByName.get(slot.character),current=unit?.items.find(item=>item.slotId===slot.slotId);
  const booster=unit?.items.find(item=>plan.catalogEquipment[item.id]?.type==="I_Booster_Block");
  // Alternatives can require different refinement levels; verify the actual proposed item.
  const minimumLevel=equipmentReplacementMinimumLevel(current,source.id,plan.catalogEquipment,booster);
  const inventoryReady=minimumLevel!==null&&slot.state==="EQUIP NOW"&&slot.allocatedItemId===source.id&&(slot.allocatedLevel??0)>=minimumLevel;
  return minimumLevel===null?[]:[{character:slot.character,characterId:slot.characterId!,slotId:slot.slotId,itemId:source.id,minimumLevel,inventoryReady}];
 }):[]);
 // The browser needs restrictions and names, not the full per-level stat tables.
 const equipment=Object.fromEntries(Object.entries(plan.catalogEquipment).map(([id,item])=>[id,{type:item.type,rarity:item.rarity,...(item.name?{name:item.name}:{}),...(item.allowedUnits?{allowedUnits:item.allowedUnits}:{}),...(item.allowedFactions?{allowedFactions:item.allowedFactions}:{})}])) as Record<string,EquipmentDefinition>;
 return {units:report.roster,targets,characters:catalog.characters.map(character=>({id:character.id,name:character.name,faction:plan.unitByName.get(character.name)?.faction??character.faction,equipment:character.equipment})),equipment,raidNames:plan.raidNames,raidOptions,campaignNames,campaignUnknown,campaignHelpers,focus:protectedFocus,defenseTeams,offenseTeams,planningScores:plan.planning.scores,planningPreferences:plan.planning.preferences,planningRoles:plan.planning.roles} satisfies ReallocationProps;
}
