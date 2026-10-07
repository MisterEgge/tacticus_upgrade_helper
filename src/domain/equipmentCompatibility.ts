export type EquipmentStats = {hp?:number;armor?:number;blockChance?:number;blockDamage?:number;blockChanceBonus?:number;blockDamageBonus?:number;critChance?:number;critDamage?:number;critChanceBonus?:number;critDamageBonus?:number};
export type EquipmentDefinition = {type:string;rarity:string;name?:string;allowedUnits?:string[];allowedFactions?:string[];baseStats?:EquipmentStats;statsByLevel?:EquipmentStats[]};
export type EquipmentCharacter = {id:string;name:string;faction:string;equipment:string[];traits?:string[]};

/** Exact upstream faction IDs and stable unit IDs; display names are not faction keys. */
export function equipmentCompatibility(item:EquipmentDefinition,character:{id:string;faction:string;equipment:string[]}):"compatible"|"incompatible"|"unknown" {
 if(!character.equipment.includes(item.type))return "incompatible";
 if(item.allowedUnits?.includes(character.id)||item.allowedFactions?.includes(character.faction))return "compatible";
 if(!item.allowedUnits?.length&&!item.allowedFactions?.length)return "unknown";
 if(!character.faction)return "unknown";
 return "incompatible";
}
export function equipmentStatsAtLevel(item:EquipmentDefinition|undefined,level:number):EquipmentStats|null {
 if(!item||!Number.isInteger(level)||level<1)return null;
 return item.statsByLevel?.[level-1]??(level===1?item.baseStats??null:null);
}
export function equipmentFamily(id:string):string|null {return /_[CURELM]\d{3}$/.test(id)?id.replace(/_[CURELM](\d{3})$/,"_$1"):null;}
