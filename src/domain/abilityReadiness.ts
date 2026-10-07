import {abilityLevelCap,abilityRarityForLevel,badgeCostBetween,type BadgeCost} from "./abilityCosts";
import {badgeShortfalls,type AbilityBadgeInventory} from "./badgeInventory";

type AbilityProgress={level:number|null;target:number;xpLevel:number;rarity:string;alliance:string};
export type AbilityReadiness={
 state:"TARGET MET"|"UNKNOWN"|"GATED"|"BADGES NEEDED"|"CHECK BADGES"|"LEVEL ELIGIBLE";
 nextLevel:number|null;reachable:number|null;gates:string[];
 nextCost:BadgeCost;planned:BadgeCost;eligible:BadgeCost;
 badges:ReturnType<typeof badgeShortfalls>;
};

/** One optional next level, checked against shared stock. Coins are not exported,
 * and checking two abilities does not reserve the same badges twice.
 */
export function abilityReadiness(progress:AbilityProgress,inventory:AbilityBadgeInventory|null|undefined):AbilityReadiness {
 const {level,target,xpLevel,rarity}=progress;
 const row:AbilityReadiness={state:"UNKNOWN",nextLevel:null,reachable:null,gates:[],nextCost:{},planned:{},eligible:{},badges:[]};
 if(level===null||!Number.isInteger(level)||level<1||level>60){row.gates=["Sync an unlocked ability level"];return row;}
 if(!Number.isInteger(target)||target<1||target>60){row.gates=["Target needs review"];return row;}
 if(level>=target){row.state="TARGET MET";row.reachable=level;return row;}
 row.planned=badgeCostBetween(level,target);
 const cap=abilityLevelCap(rarity);
 if(cap===null||!Number.isInteger(xpLevel)||xpLevel<1||xpLevel>60){row.gates=[cap===null?"Rarity needs review":"Sync character XP level"];return row;}
 row.reachable=Math.min(target,xpLevel,cap);
 row.nextLevel=level+1;
 row.nextCost=badgeCostBetween(level,row.nextLevel);
 row.eligible=badgeCostBetween(level,row.reachable);
 const alliance=progress.alliance==="Imperium"?"Imperial":progress.alliance;
 const knownAlliance=["Imperial","Chaos","Xenos"].includes(alliance);
 row.badges=badgeShortfalls(knownAlliance?inventory:null,alliance,row.nextCost,row.nextCost);
 if(xpLevel<row.nextLevel)row.gates.push(`Level character to ${row.nextLevel}`);
 if(cap<row.nextLevel)row.gates.push(`Ascend to ${abilityRarityForLevel(row.nextLevel)}`);
 if(row.gates.length)row.state="GATED";
 else if(row.badges.some(badge=>badge.owned===null))row.state="CHECK BADGES";
 else if(row.badges.some(badge=>(badge.shortfall??0)>0))row.state="BADGES NEEDED";
 else row.state="LEVEL ELIGIBLE";
 return row;
}
