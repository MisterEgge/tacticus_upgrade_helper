import { badgeCostBetween, totalBadgeCosts, abilityLevelCap } from "./abilityCosts";
import { utilityAtLeast, type UtilityTier } from "./characterUtility";

export type BudgetRow = { id:string; name:string; alliance:string; rank:number; rarity:string; xpLevel:number; activeLevel:number|null; passiveLevel:number|null; activeTarget:number; passiveTarget:number; reviewed:boolean; recommended:boolean; communityScore:number|null; accountPriority:number; mainRaid:boolean; utilityTier:UtilityTier; utilitySignals:string[] };
export type BudgetScope = "useful"|"situational"|"top"|"raid";

export function eligibleForBudget(row:BudgetRow,scope:BudgetScope,minRank:number):boolean
{
    if(row.rank<minRank)return false;
    if(scope==="raid")return row.mainRaid;
    if(scope==="top")return row.utilityTier==="Core";
    return utilityAtLeast(row.utilityTier,scope==="situational"?"Situational":"Useful");
}

export function budgetForRow(row:BudgetRow,cap:number)
{
    const activeTarget=Math.min(cap,row.activeTarget);
    const passiveTarget=Math.min(cap,row.passiveTarget);
    const levelCap=Math.min(cap,row.xpLevel,abilityLevelCap(row.rarity)??0);
    const planned=totalBadgeCosts([badgeCostBetween(row.activeLevel,activeTarget),badgeCostBetween(row.passiveLevel,passiveTarget)]);
    const eligible=totalBadgeCosts([badgeCostBetween(row.activeLevel,Math.min(activeTarget,levelCap)),badgeCostBetween(row.passiveLevel,Math.min(passiveTarget,levelCap))]);
    return {activeTarget,passiveTarget,planned,eligible};
}
