import fs from "node:fs/promises";
import path from "node:path";
import {getCharacterCatalog} from "./catalog";

export type EquipmentRow = {
  character: string; characterId?: string; slotId: string; currentItem: string; currentRarity: string;
  currentLevel: number; accountPriority: number; recommendedItemId?: string; recommendedItem?: string; compatibleLegendaryItemIds?: string[];
  preferredLegendaryItemIds?: string[]; preferredLegendaryItems?: string[];
};
export type AbilityRow = {
  character:string; faction:string; activeId:string; activeLevel:number; passiveId:string; passiveLevel:number;
  activeTo17:boolean; passiveTo17:boolean; accountPriority:number; focus:string; basis:string; communityActiveTarget:string; communityPassiveTarget:string; targetConfidence:string;
};
export type RosterUnit = {
  id:string; icon?:string; name:string; faction:string; grandAlliance:string; rarity:string; rank:number; xpLevel:number;
  upgrades?:number[]; progressionIndex:number; shards:number; mythicShards:number; power?:number; abilities:Array<{id:string;level:number}>;
  items:Array<{slotId:string;level:number;id:string;name?:string;rarity?:string}>;
};
export type InventoryItem = { id:string; name?:string; level:number; amount:number };
export type Report = {
  generatedAt:string; source:{player:string;powerLevel:number};
  summary:{units:number;charactersWithAbilitiesBelow17:number;individualAbilityUpgradesTo17:number;legendaryUnderTierSlots:number};
  abilityQueue:AbilityRow[]; roster:RosterUnit[]; unequippedInventory:InventoryItem[];
  equipmentAllocation:{equipNow:EquipmentRow[];buyWatch:EquipmentRow[];compatibilityUnknown:EquipmentRow[]};
  campaignProgress?:Array<{id:string;name:string;type:"Standard"|"Mirror"|"Elite"|"EliteMirror";highestUnlockedBattle:number|null;highestCompletedBattle?:number|null;highestConfirmedThreeStarBattle?:number|null;battles:Array<{battleIndex:number;attemptsLeft:number;attemptsUsed:number}>}>;
  upgradeInventory?:Array<{id:string;name?:string;amount:number}>;
};
export async function getReport():Promise<Report|null>{
  try{
    const report=JSON.parse(await fs.readFile(path.join(process.cwd(),"output","upgrade-report.json"),"utf8")) as Report;
    const catalog=await getCharacterCatalog();
    const byKey=new Map(catalog.characters.flatMap(c=>[[c.id.toLowerCase(),c],[c.name.toLowerCase(),c],[c.fullName.toLowerCase(),c],[c.shortName.toLowerCase(),c]] as const));
    report.roster=report.roster.map(u=>{const c=byKey.get(u.id.toLowerCase())??byKey.get(u.name.toLowerCase());return {...u,icon:c?.icon??""};});
    return report;
  }catch{return null;}
}
export function targetName(row:EquipmentRow){return row.recommendedItem??row.preferredLegendaryItems?.join(", ")??row.preferredLegendaryItemIds?.join(", ")??"Review";}
export function unitFor(report:Report,name:string){return report.roster.find(unit=>unit.name===name);}
