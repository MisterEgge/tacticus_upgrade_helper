import {restoreWarTeamIndexes,type WarTeamCandidate} from "./warTeams";
import type {EquipmentTargetRarity} from "./equipmentTier";
export type EquipmentWarTeam=WarTeamCandidate & {name:string};
export type EquipmentScope="teams"|"raid"|"war"|"campaign"|"all";
export function selectedWarGearGoals(defense:EquipmentWarTeam[],offense:EquipmentWarTeam[],saved:unknown):Map<string,"silver"|"gold">
{
 const plan=saved&&typeof saved==="object"?saved as Record<string,unknown>:{};
 const goals=new Map<string,"silver"|"gold">();
 const add=(team:EquipmentWarTeam,tier:"silver"|"gold")=>team.members.forEach(member=>{if(goals.get(member.name)!=="gold")goals.set(member.name,tier);});
 restoreWarTeamIndexes(defense,plan.defense,Math.min(10,defense.length)).slice(0,5).forEach((index,slot)=>add(defense[index]!,slot<2?"gold":"silver"));
 const tiers=Array.isArray(plan.offenseTiers)&&plan.offenseTiers.length===10&&plan.offenseTiers.every(tier=>tier==="gold"||tier==="silver")?plan.offenseTiers:[];
 restoreWarTeamIndexes(offense,plan.offense,10).forEach((index,slot)=>add(offense[index]!,tiers[slot]==="gold"?"gold":"silver"));
 return goals;
}
export function equipmentTeamGoal(name:string,rarity:string,raid:Set<string>,war:Map<string,"silver"|"gold">,scope:EquipmentScope)
{
 const raidSelected=(scope==="teams"||scope==="raid")&&raid.has(name);
 const warTier=(scope==="teams"||scope==="war")?war.get(name):undefined;
 if(!raidSelected&&!warTier)return null;
 const order=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 const desired=raidSelected?"Legendary":warTier==="gold"?"Epic":"Rare";
 const capped=order[Math.min(order.indexOf(desired),Math.max(0,order.indexOf(rarity)))]!;
 return {rarity:capped,level:raidSelected?1:capped==="Epic"?9:capped==="Rare"?7:capped==="Uncommon"?5:3,priority:raidSelected?100:warTier==="gold"?80:60,label:raidSelected?"Main raid team":`War · ${warTier==="gold"?"Gold":"Silver"} target`};
}
export type DefensiveEquipment={type:string;rarity:string;allowedUnits?:string[];allowedFactions?:string[];baseStats?:{hp?:number;armor?:number}};
export function preferredDefensiveItemId(unit:{id:string;faction:string},traits:string[],equipmentTypes:string[],rarity:string,currentId:string,equipment:Record<string,DefensiveEquipment>):string|null
{
 if(!equipmentTypes.includes("I_Defensive")||equipment[currentId]?.type!=="I_Defensive"||traits.includes("MkXGravis"))return null;
 const current=equipment[currentId]?.baseStats;
 const order=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 if(current&&current.hp&&current.armor&&order.indexOf(rarity)<=order.indexOf(equipment[currentId]!.rarity))return null;
 return Object.entries(equipment).find(([,item])=>item.type==="I_Defensive"&&item.rarity===rarity&&!!item.baseStats?.hp&&!!item.baseStats.armor&&(item.allowedUnits?.includes(unit.id)||item.allowedFactions?.includes(unit.faction)))?.[0]??null;
}
