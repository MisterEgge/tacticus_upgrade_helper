import {getShopCatalog} from "./shops";
import {getCharacterCatalog,getAbilityBreakpoints} from "./catalog";
import {getAccountEquipmentPlan} from "./accountEquipmentPlan";
import {characterRosterRow} from "./characterUpgradeSummary";
import {abilityGuideRows} from "../../src/domain/abilities";
import type {Report} from "./report";

export async function getAccountActions(report:Report) {
 const [shops,catalog,breakpoints]=await Promise.all([getShopCatalog(),getCharacterCatalog(),getAbilityBreakpoints()]);
 const equipment=await getAccountEquipmentPlan(report,catalog,shops);
 const guides=new Map(abilityGuideRows(catalog.characters,report.roster,breakpoints,{}).map(row=>[row.id,row]));
 const ids=new Set(catalog.characters.map(character=>character.id));
 const rows=report.roster.filter(unit=>ids.has(unit.id)).map(unit=>characterRosterRow(unit,guides.get(unit.id),equipment.rows.find(row=>row.characterId===unit.id)?.slots??[],report.abilityBadges,report.orbInventory));
 return {equipment,rows};
}
