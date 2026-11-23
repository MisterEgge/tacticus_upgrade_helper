import {selectedRaidNames} from "../../src/domain/raidSelection";
import {getMainRaidSelection,getRaidMeta} from "./raidSelection";
import {buildEquipmentPlan} from "./equipmentPlan";
import type {Report} from "./report";
import type {CatalogCharacter} from "./catalog";
import type {ShopCatalog} from "../../src/domain/shops";
import {getPlanningContext} from "./playerPriorities";

/** Every account view reserves gear for the same selected, owned Raid lineup. */
export async function getAccountEquipmentPlan(report:Report,catalog:{characters:CatalogCharacter[]},shops:ShopCatalog|null){
 const meta=await getRaidMeta();
 const selection=await getMainRaidSelection(meta.bosses,report);
 const team=meta.bosses[selection.boss]?.[selection.teamName];
 const owned=new Set(report.roster.map(unit=>unit.name));
 const raidNames=team?selectedRaidNames(selection,team).filter(name=>owned.has(name)):[];
 const planning=await getPlanningContext(report,catalog);
 return {...buildEquipmentPlan(report,catalog,shops,new Set(raidNames),planning.scores),raidNames,planning};
}
