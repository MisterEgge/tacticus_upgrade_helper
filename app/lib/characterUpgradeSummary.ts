import {abilityReadiness} from "../../src/domain/abilityReadiness";
import {characterAscension,type AscensionStep} from "../../src/domain/characterAscension";
import type {AbilityGuideRow} from "../../src/domain/abilities";
import type {AbilityBadgeInventory} from "../../src/domain/badgeInventory";
import type {OrbInventory} from "../../src/domain/orbPlanner";
import type {RosterUnit} from "./report";
import type {buildEquipmentPlan} from "./equipmentPlan";

export type CharacterEquipmentSlot=ReturnType<typeof buildEquipmentPlan>["rows"][number]["slots"][number];
export type RosterAction={kind:"equipment"|"ability"|"ascension";label:string;detail:string;ready:boolean;href:string;resourceId?:string|undefined};
export type CharacterRosterRow=RosterUnit&{actions:RosterAction[];gearWork:boolean;badgesNeeded:boolean;orbsNeeded:boolean};

const equipmentScore=(slot:CharacterEquipmentSlot)=>slot.state==="EQUIP NOW"?0:slot.state==="LEVEL INVENTORY"?1:slot.state==="LEVEL UP"?2:slot.acquisition.some(source=>source.offers.length)?3:slot.state==="UNKNOWN"?5:4;
export function orderedEquipmentChoices(slots:CharacterEquipmentSlot[]) {
 return [...slots].sort((a,b)=>equipmentScore(a)-equipmentScore(b)||["Mythic","Legendary","Epic","Rare"].indexOf(a.itemRarity)-["Mythic","Legendary","Epic","Rare"].indexOf(b.itemRarity));
}
export function equipmentAction(slot:CharacterEquipmentSlot):{label:string;detail:string;ready:boolean} {
 if(slot.state==="EQUIP NOW")return {label:`Equip ${slot.target}`,detail:`Inventory copy reserved · level ${slot.allocatedLevel??1}`,ready:true};
 if(slot.state==="LEVEL INVENTORY")return {label:`Refine ${slot.target}`,detail:`Inventory replacement needs level ${slot.minimumLevel} · check coins and salvage`,ready:false};
 if(slot.state==="LEVEL UP")return {label:`Refine equipped ${slot.target}`,detail:"Check coins and salvage",ready:false};
 if(slot.state==="UNKNOWN")return {label:"Review gear compatibility or refinement",detail:slot.target,ready:false};
 if(slot.freeCopies>0)return {label:`Inventory alternative: ${slot.target}`,detail:"Shared copy · no allocation assigned",ready:false};
 const shops=[...new Set(slot.acquisition.flatMap(source=>source.offers.map(offer=>offer.shop)))];
 return {label:`Get ${slot.target}`,detail:shops.length?`${shops.join(" / ")} · check current stock`:"No eligible shop route recorded",ready:false};
}
export function ascensionAction(plan:AscensionStep):{label:string;detail:string;ready:boolean} {
 const costs=[`${plan.shardsNeeded} ${plan.shardType==="Mythic"?"Mythic ":""}shards`,...(plan.orbsNeeded?[`${plan.orbsNeeded} ${plan.alliance} ${plan.orbRarity} orbs`]:[])].join(" + ");
 if(plan.state==="MAXED")return {label:plan.label,detail:"",ready:false};
 if(plan.shardsNeeded&&plan.shardShortfall===null)return {label:"Check shard inventory",detail:`${plan.shardsNeeded} ${plan.shardType} shards required · sync missing stock`,ready:false};
 if((plan.shardShortfall??0)>0)return {label:`Collect shards for ${plan.label.replace(/^Ascend to /,"").replace(/^Promote next star$/,"next star")}`,detail:`${plan.shardShortfall} ${plan.shardType} shards short · ${plan.shardsOwned} / ${plan.shardsNeeded} owned`,ready:false};
 if(plan.state==="UNKNOWN")return {label:plan.label,detail:plan.shardsNeeded?`${costs} · sync missing stock`:"Sync progression",ready:false};
 const missing=[...(plan.shardShortfall?[`${plan.shardShortfall} ${plan.shardType==="Mythic"?"Mythic ":""}shards short`]:[]),...(plan.orbShortfall?[`${plan.orbShortfall} ${plan.alliance} ${plan.orbRarity} orbs short`]:[])];
 return {label:plan.label,detail:missing.length?missing.join(" · "):"Shards and orbs covered · check coins",ready:plan.state==="RESOURCES COVERED"};
}

/** Compact roster actions use the same targets, gates and shared equipment
 * allocations as the detail pages, rather than the report's level-17 audit. */
export function characterRosterRow(unit:RosterUnit,guide:AbilityGuideRow|undefined,slots:CharacterEquipmentSlot[],badges:AbilityBadgeInventory|null|undefined,orbs:OrbInventory|null|undefined,verified=true):CharacterRosterRow {
 if(!verified)return {...unit,actions:[{kind:"ability",label:"Unit planning needs verification",detail:"Outside the character catalog",ready:false,href:`/characters/${encodeURIComponent(unit.id)}`}],gearWork:false,badgesNeeded:false,orbsNeeded:false};
 const href=`/characters/${encodeURIComponent(unit.id)}`,actions:RosterAction[]=[];
 const gear=orderedEquipmentChoices(slots)[0];
 if(gear){const action=equipmentAction(gear);const count=new Set(slots.map(slot=>slot.slotId)).size;actions.push({kind:"equipment",...action,resourceId:gear.state==="LEVEL UP"?gear.currentItemId:gear.allocatedItemId??gear.acquisition[0]?.id,detail:`${action.detail}${count>1?` · ${count} gear slots need work`:""}`,href:`${href}#equipment`});}
 const abilities=(["Active","Passive"] as const).map((label,index)=>{
  const target=(index===0?guide?.activeTargetLevel:guide?.passiveTargetLevel)??17;
  return {label,target,plan:abilityReadiness({level:unit.abilities[index]?.level??null,target,xpLevel:unit.xpLevel,rarity:unit.rarity,alliance:unit.grandAlliance},badges)};
 }).filter(row=>row.plan.state!=="TARGET MET");
 const priority=(state:string)=>["LEVEL ELIGIBLE","BADGES NEEDED","CHECK BADGES","GATED","UNKNOWN"].indexOf(state);
 const ability=[...abilities].sort((a,b)=>priority(a.plan.state)-priority(b.plan.state))[0];
 if(ability){const plan=ability.plan;
  const detail=plan.state==="LEVEL ELIGIBLE"?"Badges covered · check coins":plan.state==="BADGES NEEDED"?plan.badges.filter(badge=>(badge.shortfall??0)>0).map(badge=>`${badge.shortfall} ${unit.grandAlliance} ${badge.rarity} badges short`).join(" · "):plan.state==="CHECK BADGES"?"Sync badges · check coins":plan.gates.join(" · ");
  actions.push({kind:"ability",label:`${ability.label}${plan.nextLevel?` → ${plan.nextLevel}`:" needs review"}`,detail:`${detail}${guide?.recommended?` · target ${ability.target}`:" · provisional target 17"}${abilities.length>1?" · both abilities need work":""}`,ready:plan.state==="LEVEL ELIGIBLE",href:`${href}#abilities`});
 }
 const ascension=characterAscension({progressionIndex:unit.progressionIndex,alliance:unit.grandAlliance,shards:unit.shards,mythicShards:unit.mythicShards},orbs);
 if(ascension.state!=="MAXED"&&ascension.state!=="OPTIONAL")actions.push({kind:"ascension",...ascensionAction(ascension),href:`${href}#progression`});
 return {...unit,actions,gearWork:slots.length>0,badgesNeeded:abilities.some(row=>row.plan.state==="BADGES NEEDED"),orbsNeeded:ascension.state!=="OPTIONAL"&&ascension.shardShortfall===0&&(ascension.orbShortfall??0)>0};
}
