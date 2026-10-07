import {equipmentCompatibility,equipmentStatsAtLevel,type EquipmentDefinition} from "./equipmentCompatibility";
const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];

/** General reliability preference, not proof that a low-chance item is useless. */
export function preferredBlockItemId(unit:{id:string;faction:string},types:string[],rarity:string,currentId:string,equipment:Record<string,EquipmentDefinition>):string|null {
 const current=equipment[currentId];
 if(!current||current.type!=="I_Block"||!types.includes("I_Block")||tiers.indexOf(rarity)<tiers.indexOf(current.rarity))return null;
 const chance=current.baseStats?.blockChance;
 if(chance===undefined)return null;
 const candidates=Object.entries(equipment).filter(([,candidate])=>candidate.type==="I_Block"&&candidate.rarity===rarity&&(candidate.baseStats?.blockChance??0)>chance&&(candidate.baseStats?.blockChance??0)>=30&&equipmentCompatibility(candidate,{...unit,equipment:types})==="compatible");
 candidates.sort((a,b)=>(b[1].baseStats?.blockChance??0)-(a[1].baseStats?.blockChance??0)||(b[1].baseStats?.blockDamage??0)-(a[1].baseStats?.blockDamage??0)||a[0].localeCompare(b[0]));
 return candidates[0]?.[0]??null;
}
export function expectedBlockReduction(chance:number,damage:number,hits=3):number {
 const p=Math.min(1,Math.max(0,chance/100));
 return damage*Array.from({length:hits},(_,i)=>p**(i+1)).reduce((a,b)=>a+b,0);
}

/** Do not auto-equip a less refined replacement merely because its chance is higher.
 * Compare a documented three-hit reliability scenario; enemy damage and survival remain situational.
 */
export function minimumBlockReplacementLevel(current:{id:string;level:number},targetId:string,equipment:Record<string,EquipmentDefinition>,bonus={chance:0,damage:0}):number|null {
 const old=equipmentStatsAtLevel(equipment[current.id],current.level),target=equipment[targetId];
 if(!old?.blockChance||old.blockDamage===undefined||!target?.baseStats?.blockChance)return null;
 const oldExpected=expectedBlockReduction(old.blockChance+bonus.chance,old.blockDamage+bonus.damage);
 const levels=target.statsByLevel??(target.baseStats?[target.baseStats]:[]);
 const index=levels.findIndex(stats=>stats.blockChance!==undefined&&stats.blockDamage!==undefined&&expectedBlockReduction(stats.blockChance+bonus.chance,stats.blockDamage+bonus.damage)>=oldExpected);
 return index<0?null:index+1;
}
