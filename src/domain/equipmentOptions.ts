import {preferredDefensiveItemId,type DefensiveEquipment} from "./equipmentGoals";
import {equipmentTargetRarities,tierUpgradeItemId} from "./equipmentTier";

/** Shared roster-wide replacement rules. Mode caps never choose a weaker replacement. */
export function equipmentUpgradeOptions(unit:{id:string;faction:string;rarity:string},character:{traits:string[];equipment:string[]},item:{id:string;rarity?:string},equipment:Record<string,DefensiveEquipment>)
{
 const tiers=["Common",...equipmentTargetRarities,"Mythic"];
 return equipmentTargetRarities.flatMap(rarity=>{
  if(tiers.indexOf(rarity)>tiers.indexOf(unit.rarity))return [];
  const preferred=preferredDefensiveItemId(unit,character.traits,character.equipment,rarity,item.id,equipment);
  const id=preferred??tierUpgradeItemId(item.rarity??"",item.id,rarity,equipment);
  return id?[{id,rarity,reason:preferred?"Preferred health + armor":"Rarity upgrade"}]:[];
 });
}
