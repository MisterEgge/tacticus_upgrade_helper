import {RANK_NAMES} from "./ranks";
import {progressionRarity} from "./characterProgression";
import type {WarGearCap} from "./warGear";

const WAR_GOLD_ABILITY_CAP=35;
const WAR_TIER_MIN_RANK:Record<WarGearCap,number>={silver:RANK_NAMES.indexOf("Silver I"),gold:RANK_NAMES.indexOf("Gold I")};
const WAR_TIER_PROGRESSION_CAP:Record<WarGearCap,number>={silver:8,gold:11};
const WAR_TIER_ABILITY_CAP:Record<WarGearCap,number>={silver:26,gold:WAR_GOLD_ABILITY_CAP};

export function warTierMinimumRank(tier:WarGearCap):number{return WAR_TIER_MIN_RANK[tier];}
export function warTierDefaultForRanks(ranks:Array<number|null>):WarGearCap{return ranks.length>0&&ranks.every(rank=>rank!==null&&rank>=warTierMinimumRank("gold"))?"gold":"silver";}
export function warTierProgressionCap(tier:WarGearCap):number{return WAR_TIER_PROGRESSION_CAP[tier];}
export function warTierAbilityCap(tier:WarGearCap):number{return WAR_TIER_ABILITY_CAP[tier];}
export function warTierProgressionMet(index:number,tier:WarGearCap):boolean{return progressionRarity(index)!==null&&index>=warTierProgressionCap(tier);}
