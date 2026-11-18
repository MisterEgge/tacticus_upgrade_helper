import {restoreDefenseSlots,restoreWarTeamIndexes,type WarTeamCandidate} from "./warTeams";
import type {EquipmentTargetRarity} from "./equipmentTier";
import type {EquipmentDefinition} from "./equipmentCompatibility";
type WarMember={id?:string;name:string};
export type EquipmentWarTeam=Omit<WarTeamCandidate,"members"> & {name:string;tier?:"gold"|"silver";slot?:number;rosterBuilt?:boolean;members:WarMember[];core?:string[];flex?:WarMember[]};
export type EquipmentScope="teams"|"raid"|"war"|"campaign"|"all";
export function selectedWarGearGoals(defense:EquipmentWarTeam[],offense:EquipmentWarTeam[],saved:unknown):Map<string,"silver"|"gold">
{
 const plan=saved&&typeof saved==="object"?saved as Record<string,unknown>:{};
 const goals=new Map<string,"silver"|"gold">();
 const savedValue=(value:unknown,key:string)=>value&&typeof value==="object"? (value as Record<string,unknown>)[key]:undefined;
 const add=(team:EquipmentWarTeam,tier:"silver"|"gold",overrides:unknown)=>{
  const selected=savedValue(overrides,team.name);
  const flex=Array.isArray(selected)&&selected.length===2&&new Set(selected).size===2
   ?selected.flatMap(value=>team.flex?.find(member=>value===member.name||value===member.id)??[]):[];
  const members=flex.length===2&&team.core?.length===3
   ?[...team.members.filter(member=>team.core!.includes(member.name)||!!member.id&&team.core!.includes(member.id)),...flex]:team.members;
  for(const member of members)if(goals.get(member.name)!=="gold")goals.set(member.name,tier);
 };
 if(defense.some(team=>team.slot!==undefined)){
  restoreDefenseSlots(defense,plan.defense).forEach((index,slot)=>{
   if(index!==null)add(defense[index]!,slot<2?"gold":"silver",plan.defenseFlex);
  });
 }else{
  restoreWarTeamIndexes(defense,plan.defense,Math.min(10,defense.length)).slice(0,5)
   .forEach((index,slot)=>add(defense[index]!,defense[index]!.tier??(slot<2?"gold":"silver"),plan.defenseFlex));
 }
 const tiers=Array.isArray(plan.offenseTiers)&&plan.offenseTiers.length===10&&plan.offenseTiers.every(tier=>tier==="gold"||tier==="silver")?plan.offenseTiers:[];
 restoreWarTeamIndexes(offense,plan.offense,10).forEach((index,slot)=>{
  const team=offense[index]!,target=savedValue(plan.offenseTargets,team.name)??tiers[slot];
  add(team,target==="gold"?"gold":"silver",plan.offenseFlex);
 });
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
export type DefensiveEquipment=EquipmentDefinition;
export function preferredDefensiveItemId(unit:{id:string;faction:string},traits:string[],equipmentTypes:string[],rarity:string,currentId:string,equipment:Record<string,DefensiveEquipment>):string|null
{
 if(!equipmentTypes.includes("I_Defensive")||equipment[currentId]?.type!=="I_Defensive"||traits.includes("MkXGravis"))return null;
 const current=equipment[currentId]?.baseStats;
 const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 // Type corrections may offer Epic as well as Legendary, but never Rare for equipped Legendary gear.
 if(tiers.indexOf(rarity)<Math.min(tiers.indexOf(equipment[currentId]!.rarity),tiers.indexOf("Epic")))return null;
 const order=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 if(current&&current.hp&&current.armor&&order.indexOf(rarity)<=order.indexOf(equipment[currentId]!.rarity))return null;
 return Object.entries(equipment).find(([,item])=>item.type==="I_Defensive"&&item.rarity===rarity&&!!item.baseStats?.hp&&!!item.baseStats.armor&&(item.allowedUnits?.includes(unit.id)||item.allowedFactions?.includes(unit.faction)))?.[0]??null;
}

/** A mode target is a minimum, not an instruction to replace gear with that exact tier. */
export function equipmentOptionFitsGoal(currentRarity:string,targetRarity:string,characterRarity:string,goal:{rarity:string;priority:number}):boolean
{
 const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 const current=tiers.indexOf(currentRarity),target=tiers.indexOf(targetRarity),character=tiers.indexOf(characterRarity);
 if(current<0||target<0||character<0)return false;
 return target<=character&&target>=Math.min(current,tiers.indexOf("Epic"))&&(goal.priority===100||target>=tiers.indexOf(goal.rarity));
}
