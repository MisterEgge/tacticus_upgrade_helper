import {preferredDefensiveItemId,type DefensiveEquipment} from "./equipmentGoals";
import {equipmentTargetRarities,tierUpgradeItemId} from "./equipmentTier";
import {minimumBlockReplacementLevel,preferredBlockItemId} from "./blockEquipment";
import {preferredActOfFaithCritItemId} from "./critEquipment";
import {equipmentStatsAtLevel} from "./equipmentCompatibility";

export function equipmentReplacementMinimumLevel(current:{id:string;level:number}|undefined,target:string|undefined,items:Record<string,DefensiveEquipment>,blockBooster?:{id:string;level:number}){
 if(!current||!target||current.id===target)return 1;
 if(items[current.id]?.type==="I_Block"){
  const bonus=blockBooster?equipmentStatsAtLevel(items[blockBooster.id],blockBooster.level):null;
  return blockBooster&&!bonus?null:minimumBlockReplacementLevel(current,target,items,{chance:bonus?.blockChanceBonus??0,damage:bonus?.blockDamageBonus??0});
 }
 if(items[current.id]?.type==="I_Booster_Crit"){
  const base=equipmentStatsAtLevel(items[current.id],current.level);
  if(base?.critChanceBonus===undefined||base.critDamageBonus===undefined)return null;
  const candidate=items[target];
  for(let level=1;level<=(candidate?.statsByLevel?.length??1);level++){
   const stats=equipmentStatsAtLevel(candidate,level);
   if(stats?.critChanceBonus===undefined||stats.critDamageBonus===undefined)continue;
   const chance=stats.critChanceBonus-base.critChanceBonus,damage=stats.critDamageBonus-base.critDamageBonus;
   if(chance>=0&&damage>=0&&(chance>0||damage>0))return level;
  }
  return null;
 }
 return 1;
}

export function preferredEquipmentItemId(unit:{id:string;faction:string},traits:string[],types:string[],rarity:string,currentId:string,equipment:Record<string,DefensiveEquipment>) {
 return preferredBlockItemId(unit,types,rarity,currentId,equipment)
  ??preferredDefensiveItemId(unit,traits,types,rarity,currentId,equipment)
  ??preferredActOfFaithCritItemId(unit,traits,types,rarity,currentId,equipment);
}

/** Shared roster-wide replacement rules. Mode caps never choose a weaker replacement. */
export function equipmentUpgradeOptions(unit:{id:string;faction:string;rarity:string},character:{traits:string[];equipment:string[]},item:{id:string;rarity?:string},equipment:Record<string,DefensiveEquipment>)
{
 const tiers=["Common",...equipmentTargetRarities,"Mythic"];
 return equipmentTargetRarities.flatMap(rarity=>{
  if(tiers.indexOf(rarity)>tiers.indexOf(unit.rarity))return [];
  const preferred=preferredEquipmentItemId(unit,character.traits,character.equipment,rarity,item.id,equipment);
  const id=preferred??tierUpgradeItemId(item.rarity??"",item.id,rarity,equipment);
  return id?[{id,rarity,reason:preferred?(equipment[id]?.type==="I_Block"?"Preferred block chance · general reliability":equipment[id]?.type==="I_Crit"&&character.traits.includes("ActOfFaith")?"Preferred crit damage · Act of Faith":"Preferred health + armor"):"Rarity upgrade"}]:[];
 });
}
