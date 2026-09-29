import { badgeCostBetween, totalBadgeCosts } from "./abilityCosts";

export type BudgetRow = { id:string; name:string; alliance:string; rank:number; rarity:string; xpLevel:number; activeLevel:number|null; passiveLevel:number|null; activeTarget:number; passiveTarget:number; reviewed:boolean; recommended:boolean; communityScore:number|null; accountPriority:number; mainRaid:boolean };
export type BudgetScope = "useful"|"top"|"raid";
const rarityCaps:Record<string,number>={Common:8,Uncommon:17,Rare:26,Epic:35,Legendary:50,Mythic:60};

export function eligibleForBudget(row:BudgetRow,scope:BudgetScope,minRank:number):boolean
{
    if(row.rank<minRank)return false;
    if(scope==="raid")return row.mainRaid;
    if(scope==="top")return row.mainRaid || (row.communityScore??0)>=3.5 || row.accountPriority>=90;
    return row.mainRaid || (row.communityScore??0)>=2.7 || row.accountPriority>=68;
}

export function budgetForRow(row:BudgetRow,cap:number)
{
    const activeTarget=Math.min(cap,row.activeTarget);
    const passiveTarget=Math.min(cap,row.passiveTarget);
    const levelCap=Math.min(cap,row.xpLevel,rarityCaps[row.rarity]??0);
    const planned=totalBadgeCosts([badgeCostBetween(row.activeLevel,activeTarget),badgeCostBetween(row.passiveLevel,passiveTarget)]);
    const eligible=totalBadgeCosts([badgeCostBetween(row.activeLevel,Math.min(activeTarget,levelCap)),badgeCostBetween(row.passiveLevel,Math.min(passiveTarget,levelCap))]);
    return {activeTarget,passiveTarget,planned,eligible};
}
