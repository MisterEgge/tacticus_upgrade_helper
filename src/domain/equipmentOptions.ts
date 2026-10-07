import {preferredDefensiveItemId,type DefensiveEquipment} from "./equipmentGoals";
import {equipmentTargetRarities,tierUpgradeItemId} from "./equipmentTier";
import {preferredBlockItemId} from "./blockEquipment";

export function preferredEquipmentItemId(unit:{id:string;faction:string},traits:string[],types:string[],rarity:string,currentId:string,equipment:Record<string,DefensiveEquipment>) {
 return preferredBlockItemId(unit,types,rarity,currentId,equipment)??preferredDefensiveItemId(unit,traits,types,rarity,currentId,equipment);
}

/** Shared roster-wide replacement rules. Mode caps never choose a weaker replacement. */
export function equipmentUpgradeOptions(unit:{id:string;faction:string;rarity:string},character:{traits:string[];equipment:string[]},item:{id:string;rarity?:string},equipment:Record<string,DefensiveEquipment>)
{
 const tiers=["Common",...equipmentTargetRarities,"Mythic"];
 return equipmentTargetRarities.flatMap(rarity=>{
  if(tiers.indexOf(rarity)>tiers.indexOf(unit.rarity))return [];
  const preferred=preferredEquipmentItemId(unit,character.traits,character.equipment,rarity,item.id,equipment);
  const id=preferred??tierUpgradeItemId(item.rarity??"",item.id,rarity,equipment);
  return id?[{id,rarity,reason:preferred?(equipment[id]?.type==="I_Block"?"Preferred block chance · general reliability":"Preferred health + armor"):"Rarity upgrade"}]:[];
 });
}
