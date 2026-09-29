import type {BadgeCost,BadgeRarity} from "./abilityCosts";

export type AbilityBadgeInventory=Record<string,Array<{rarity:string;amount:number;name?:string}>>;
const rarities:BadgeRarity[]=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
const allianceName=(value:string)=>value.toLowerCase()==="imperium"?"Imperial":value.toLowerCase()==="imperial"?"Imperial":value.toLowerCase()==="xenos"?"Xenos":value.toLowerCase()==="chaos"?"Chaos":value;

export function badgesOwned(inventory:AbilityBadgeInventory|null|undefined,alliance:string,rarity:BadgeRarity):number|null
{
    if(!inventory)return null;
    return Object.entries(inventory).filter(([key])=>allianceName(key)===alliance).flatMap(([,badges])=>Array.isArray(badges)?badges:[])
        .filter(badge=>badge.rarity===rarity&&Number.isSafeInteger(badge.amount)&&badge.amount>=0)
        .reduce((sum,badge)=>sum+badge.amount,0);
}

export function badgeShortfalls(inventory:AbilityBadgeInventory|null|undefined,alliance:string,planned:BadgeCost,eligible:BadgeCost)
{
    return rarities.filter(rarity=>(planned[rarity]??0)>0).map(rarity=>{
        const owned=badgesOwned(inventory,alliance,rarity);
        const needed=planned[rarity]??0;
        const neededNow=eligible[rarity]??0;
        return {rarity,owned,needed,shortfall:owned===null?null:Math.max(0,needed-owned),neededNow,shortfallNow:owned===null?null:Math.max(0,neededNow-owned)};
    });
}
