import priorities from "../../config/raid_rarity_priorities.json";
import {nextOrbMilestone,progressionRarity,progressionStep,rarityForGoal,CHARACTER_RARITIES,type CharacterRarity} from "./characterProgression";
import {normalizeAlliance,orbsOwned,type OrbInventory} from "./orbPlanner";
import {nextRoadmapTargets,type RoadmapCheckpoint} from "./laviscusRoadmap";

type Unit={id:string;name:string;rank:number;rarity:string;progressionIndex:number;grandAlliance:string;shards?:number|null;mythicShards?:number|null;abilities:Array<{level:number}>};
type Member={name:string;owned:boolean};
const known=(value:number|null|undefined):value is number=>typeof value==="number"&&Number.isSafeInteger(value)&&value>=0;
const shortfall=(value:number|null|undefined,cost:number)=>cost===0?0:known(value)?Math.max(0,cost-value):null;

/** A selected-team plan, with only the next spend reserved and future costs kept separate. */
export function raidRarityPlan(members:Member[],roster:Unit[],checkpoints:RoadmapCheckpoint[],inventory:OrbInventory|null|undefined){
 const selected=new Set(members.filter(member=>member.owned).map(member=>member.name));
 const profile=["Kariyan","Laviscus","Trajann"].every(name=>selected.has(name));
 const pending=nextRoadmapTargets(checkpoints,roster)?.checkpoint;
 const invalid:string[]=[];
 const candidates=roster.filter(unit=>selected.has(unit.name)).flatMap(unit=>{
  const rarity=progressionRarity(unit.progressionIndex),alliance=normalizeAlliance(unit.grandAlliance);
  if(!rarity||!["Imperial","Chaos","Xenos"].includes(alliance)){invalid.push(unit.name);return [];}
  if(unit.progressionIndex>=16)return [];
  const gates=checkpoints.flatMap(checkpoint=>checkpoint.targets.filter(target=>target.name===unit.name).map(target=>({checkpoint:checkpoint.number,rarity:target.rarity as CharacterRarity|undefined??rarityForGoal(target.rank??null,Math.max(target.active??0,target.passive??0))}))).filter(gate=>CHARACTER_RARITIES.indexOf(gate.rarity)>CHARACTER_RARITIES.indexOf(rarity));
  const currentGate=gates.find(gate=>gate.checkpoint===pending);
  const goal=unit.progressionIndex<12?12:profile||gates.some(gate=>gate.rarity==="Mythic")?16:null;
  if(goal===null)return [];
  const next=nextOrbMilestone(unit.progressionIndex)!;
  const costs:Partial<Record<CharacterRarity,number>>={};let shards=0,mythicShards=0;
  for(let from=unit.progressionIndex;from<goal;from++){const step=progressionStep(from)!;shards+=step.shards;mythicShards+=step.mythicShards;if(step.orbRarity)costs[step.orbRarity]=(costs[step.orbRarity]??0)+step.orbs;}
  const policyIndex=profile?priorities.order.indexOf(unit.name):-1;
  const reason=profile?(priorities.reasons as Record<string,string>)[unit.name]??"Selected flex: follow its rarity gates; Mythic priority needs research.":"Promote for this lineup's roadmap targets; no character-specific Mythic order recorded.";
  const mythicDue=unit.rank>=17||unit.abilities.some(ability=>ability.level>=50)||currentGate?.rarity==="Mythic";
  const timing=currentGate?`Before checkpoint ${currentGate.checkpoint}: ${currentGate.rarity} unlocks its target.`:goal===12?"Legendary before the higher Raid checkpoints.":profile?(priorities.timing as Record<string,string>)[unit.name]??"First Mythic: after the damage core, for the late support checkpoints.":"First Mythic: before the roadmap's Adamantine or level-51+ ability targets.";
  return [{unit,alliance,goal,next,costs,totalShards:shards,totalMythicShards:mythicShards,totalShardShortfall:shortfall(unit.shards,shards),totalMythicShortfall:shortfall(unit.mythicShards,mythicShards),shardShortfall:shortfall(unit.shards,next.shards),mythicShortfall:shortfall(unit.mythicShards,next.mythicShards),reason,timing,mythicDue,gate:currentGate?.checkpoint??null,priority:policyIndex<0?100:policyIndex}];
 }).sort((a,b)=>Number(!!b.gate)-Number(!!a.gate)||Number(b.goal===12)-Number(a.goal===12)||a.priority-b.priority||a.unit.name.localeCompare(b.unit.name));
 const remaining=new Map<string,number|null>();
 const rows=candidates.map(row=>{
  const key=`${row.alliance}:${row.next.orbRarity}`;
  if(!remaining.has(key))remaining.set(key,orbsOwned(inventory,row.alliance,row.next.orbRarity!));
  const available=remaining.get(key)!;
  const shardsReady=row.shardShortfall===0&&row.mythicShortfall===0;
  const readyToInvest=row.next.orbRarity!=="Mythic"||row.mythicDue;
  const reserved=available===null?null:shardsReady&&readyToInvest?Math.min(available,row.next.orbs):0;
  if(available!==null)remaining.set(key,available-(reserved??0));
  const orbShortfall=available===null?null:Math.max(0,row.next.orbs-(shardsReady&&readyToInvest?reserved??0:available));
  const action=row.shardShortfall===null||row.mythicShortfall===null?"Sync shard inventory.":!readyToInvest?"Build rank and key abilities; farm shards in parallel.":!shardsReady?"Collect missing shards.":available===null?"Sync orb inventory.":orbShortfall!>0?"Collect missing orbs.":"Promote now; check coins in-game.";
  return {...row,reserved,orbShortfall,action};
 });
 return {rows,invalid,profile};
}
