import {equipmentCompatibility,type EquipmentDefinition} from "./equipmentCompatibility";
const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];

/** Act of Faith stacks crit damage before the next crit, favoring a stronger crit item. */
export function preferredActOfFaithCritItemId(
 unit:{id:string;faction:string},
 traits:string[],
 types:string[],
 rarity:string,
 currentId:string,
 equipment:Record<string,EquipmentDefinition>
):string|null {
 if(!traits.includes("ActOfFaith")||!types.includes("I_Crit"))return null;
 const current=equipment[currentId];
 if(!current||current.type!=="I_Crit"||tiers.indexOf(rarity)<tiers.indexOf(current.rarity))return null;
 const currentDamage=current.baseStats?.critDamage;
 if(currentDamage===undefined)return null;
 const candidates=Object.entries(equipment).filter(([,candidate])=>
  candidate.type==="I_Crit"
  &&candidate.rarity===rarity
  &&(candidate.baseStats?.critDamage??0)>currentDamage
  &&equipmentCompatibility(candidate,{...unit,equipment:types})==="compatible"
 );
 candidates.sort((a,b)=>(b[1].baseStats?.critDamage??0)-(a[1].baseStats?.critDamage??0)||(b[1].baseStats?.critChance??0)-(a[1].baseStats?.critChance??0)||a[0].localeCompare(b[0]));
 return candidates[0]?.[0]??null;
}
