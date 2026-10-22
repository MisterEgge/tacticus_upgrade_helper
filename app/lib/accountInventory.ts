import {getAccountEquipmentPlan} from "./accountEquipmentPlan";
import {getCharacterCatalog} from "./catalog";
import {getShopCatalog} from "./shops";
import {orderedEquipmentChoices} from "./characterUpgradeSummary";
import {inventoryBalances} from "../../src/domain/inventoryBalance";
import type {Report} from "./report";

export async function getAccountInventory(report:Report){
 const [catalog,shops]=await Promise.all([getCharacterCatalog(),getShopCatalog()]);
 const equipment=await getAccountEquipmentPlan(report,catalog,shops);
 const targets=equipment.rows.flatMap(row=>{
  const selected=new Set<string>();
  return orderedEquipmentChoices(row.slots).flatMap(slot=>{
   if(selected.has(slot.slotId)||slot.state==="UNKNOWN"||slot.state==="LEVEL UP")return [];
   selected.add(slot.slotId);
   // Alternatives are one choice, never a requirement for every compatible item.
   const id=slot.allocatedItemId??(slot.acquisition.length===1?slot.acquisition[0]?.id:undefined);
   return id?[{itemId:id,itemName:slot.acquisition.find(source=>source.id===id)?.name??id,character:row.character,priority:slot.accountPriority+(equipment.raidNames.includes(row.character)?1000:0)}]:[];
  });
 });
 return inventoryBalances(report.unequippedInventory,targets);
}
