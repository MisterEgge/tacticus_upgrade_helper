import {progressionRarity,progressionStep,type CharacterRarity} from "./characterProgression";
import {normalizeAlliance,orbsOwned,type OrbInventory} from "./orbPlanner";

type Progress={progressionIndex:number;alliance:string;shards:number|null;mythicShards:number|null};
export type AscensionStep={
 state:"MAXED"|"OPTIONAL"|"UNKNOWN"|"SHARDS NEEDED"|"ORBS NEEDED"|"RESOURCES COVERED";
 label:string;alliance:string;shardType:"regular"|"Mythic";
 shardsNeeded:number;shardsOwned:number|null;shardShortfall:number|null;
 orbRarity:CharacterRarity|null;orbsNeeded:number;orbsOwned:number|null;orbShortfall:number|null;
};

/** Immediate promotion/ascension only. Shared orb stock is a balance check,
 * never a reservation or proof of coin affordability. */
export function characterAscension(progress:Progress,inventory:OrbInventory|null|undefined,includeStarUpgrades=false):AscensionStep {
 const step=progressionStep(progress.progressionIndex),alliance=normalizeAlliance(progress.alliance);
 const result:AscensionStep={state:"UNKNOWN",label:"Progression needs review",alliance,shardType:"regular",shardsNeeded:0,shardsOwned:null,shardShortfall:null,orbRarity:null,orbsNeeded:0,orbsOwned:null,orbShortfall:null};
 if(!step){if(progress.progressionIndex===19){result.state="MAXED";result.label="Ascension complete";}return result;}
 const current=progressionRarity(step.from),next=progressionRarity(step.to);
 result.label=current!==next?`Ascend to ${next}`:step.orbs?`${next} star upgrade`:"Promote next star";
 result.shardType=step.mythicShards>0?"Mythic":"regular";
 result.shardsNeeded=step.mythicShards||step.shards;
 const stock=step.mythicShards>0?progress.mythicShards:progress.shards;
 result.shardsOwned=stock!==null&&Number.isSafeInteger(stock)&&stock>=0?stock:null;
 result.shardShortfall=result.shardsOwned===null?null:Math.max(0,result.shardsNeeded-result.shardsOwned);
 result.orbRarity=step.orbRarity;result.orbsNeeded=step.orbs;
 result.orbsOwned=step.orbRarity&&["Imperial","Xenos","Chaos"].includes(alliance)?orbsOwned(inventory,alliance,step.orbRarity):step.orbs===0?0:null;
 result.orbShortfall=result.orbsOwned===null?null:Math.max(0,step.orbs-result.orbsOwned);
 result.state=result.shardShortfall===null?"UNKNOWN":result.shardShortfall>0?"SHARDS NEEDED":result.orbShortfall===null?"UNKNOWN":result.orbShortfall>0?"ORBS NEEDED":"RESOURCES COVERED";
 if(step.orbs&&current===next&&!includeStarUpgrades)result.state="OPTIONAL";
 return result;
}
