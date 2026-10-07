import rewards from "../../data/game/onslaught.json";
import {nextOrbMilestone,progressionRarity,type CharacterRarity} from "./characterProgression";
import {normalizeAlliance,orbsOwned,shardReadyOrbPlan,type OrbCandidate,type OrbInventory} from "./orbPlanner";
import {abilityReadiness} from "./abilityReadiness";
import {totalBadgeCosts} from "./abilityCosts";
import {badgeShortfalls,type AbilityBadgeInventory} from "./badgeInventory";

export const ALLIANCES=["Imperial","Xenos","Chaos"] as const;
export type Alliance=typeof ALLIANCES[number];
export const WAVE_BADGE_ALLIANCE:Record<Alliance,Alliance>={Imperial:"Chaos",Xenos:"Imperial",Chaos:"Xenos"};
export const SECTORS=["stone","iron","bronze","silver","gold","diamond","adamantine"] as const;
export type Sector=typeof SECTORS[number];
export type SectorChoice={sector:Sector;tier:1|2|3|4};
export type OnslaughtCandidate=OrbCandidate & {
 xpLevel:number;activeLevel:number|null;passiveLevel:number|null;
 activeTarget:number;passiveTarget:number;targetsReviewed:boolean;
 campaignShardSource:boolean;
};
export type HonorReward={shardType:"regular"|"Mythic";shards:{min:number;max:number}|null;badges:CharacterRarity[];orb:CharacterRarity|null};

/** The honoree's progression sets resource types; the played sector sets amounts
 * and chances. A collapsed sector uses its III rewards, not an invented IV. */
export function honorReward(index:number,choice:SectorChoice|null):HonorReward|null {
 const rarity=progressionRarity(index);
 if(!rarity)return null;
 const mythic=index>=15;
 const orb:CharacterRarity|null=index===2?"Uncommon":index===5?"Rare":index===8?"Epic":index>=11&&index<=14?"Legendary":index>=15&&index<=18?"Mythic":null;
 const badges:CharacterRarity[]=index===19?["Mythic"]:mythic?["Legendary","Mythic"]:index>=12?["Legendary"]:orb?[]:[rarity];
 const key=index>=16?"mythicShards":index===15?"legendaryBlue":rarity.toLowerCase();
 const table=choice?rewards.shards[choice.sector][choice.tier===4?3:choice.tier] as Record<string,number[]>:null;
 const range=table?.[key];
 return {shardType:mythic?"Mythic":"regular",shards:range?{min:range[0]!,max:range[1]!}:null,badges,orb};
}

export function readSectorChoices(value:unknown):Partial<Record<Alliance,SectorChoice>> {
 if(!value||typeof value!=="object")return {};
 const result:Partial<Record<Alliance,SectorChoice>>={};
 for(const alliance of ALLIANCES){
  const row=(value as Record<string,unknown>)[alliance];
  if(!row||typeof row!=="object")continue;
  const {sector,tier}=row as Record<string,unknown>;
  if(SECTORS.includes(sector as Sector)&&[1,2,3,4].includes(tier as number))result[alliance]={sector:sector as Sector,tier:tier as 1|2|3|4};
 }
 return result;
}

const stock=(value:number|null)=>value!==null&&Number.isSafeInteger(value)&&value>=0?value:null;
const relevance=(unit:OnslaughtCandidate,war:Map<string,number>)=>unit.utility.mainRaidCore||unit.utility.mainRaidFlex?0:unit.utility.incompleteCampaign?1:war.has(unit.name)?2:["Core","Strong","Useful"].includes(unit.utility.tier)?3:4;
export function onslaughtPriorities(candidates:OnslaughtCandidate[],orbs:OrbInventory|null|undefined,badges:AbilityBadgeInventory|null|undefined,war:Map<string,number>,choices:Partial<Record<Alliance,SectorChoice>>,includeMythic=false) {
 const ready=shardReadyOrbPlan(candidates,orbs,war,false);
 return ALLIANCES.map(alliance=>{
  const members=candidates.filter(unit=>normalizeAlliance(unit.alliance)===alliance&&progressionRarity(unit.progressionIndex));
  const pools=ready.pools.filter(pool=>pool.alliance===alliance&&pool.shortfall!==0);
  const rows=members.flatMap(unit=>{
   const reward=honorReward(unit.progressionIndex,choices[alliance]??null)!;
   const next=nextOrbMilestone(unit.progressionIndex);
   const rarity=progressionRarity(unit.progressionIndex)!;
   const orbPool=reward.orb?pools.find(pool=>pool.rarity===reward.orb&&pool.shortfall!==null&&pool.shortfall>0):undefined;
   const warTarget=war.get(unit.name);
   // Only documented practical targets or the active War slot may justify a
   // badge farmer. Provisional character targets cannot manufacture shortages.
   const target=warTarget??(unit.targetsReviewed?null:0);
   const abilityCosts=totalBadgeCosts([
    abilityReadiness({level:unit.activeLevel,target:target??unit.activeTarget,xpLevel:unit.xpLevel,rarity,alliance},badges).eligible,
    abilityReadiness({level:unit.passiveLevel,target:target??unit.passiveTarget,xpLevel:unit.xpLevel,rarity,alliance},badges).eligible
   ]);
   const badgeNeeds=badgeShortfalls(badges,alliance,abilityCosts,abilityCosts).filter(row=>reward.badges.includes(row.rarity)&&(row.shortfall??0)>0);
   const beforeLegendary=unit.progressionIndex<12;
   const shardBalance=stock(reward.shardType==="Mythic"?unit.mythicShards:unit.shards);
   const shardsNeeded=next?(reward.shardType==="Mythic"?next.mythicShards:next.shards):0;
   const shardShortfall=shardBalance===null?null:Math.max(0,shardsNeeded-shardBalance);
   const ownOrbs=next?.orbRarity?orbsOwned(orbs,alliance,next.orbRarity):null;
   const ownOrbShort=next&&ownOrbs!==null?Math.max(0,next.orbs-ownOrbs):null;
   const helpsOwnOrb=beforeLegendary&&reward.orb===next?.orbRarity&&ownOrbShort!==null&&ownOrbShort>0;
   const needsShards=beforeLegendary&&(shardShortfall===null||shardShortfall>0);
   const mythicGoal=includeMythic&&unit.progressionIndex>=15&&unit.progressionIndex<19;
   if(!needsShards&&!helpsOwnOrb&&!orbPool&&!badgeNeeds.length&&!mythicGoal)return [];
   const reasons:string[]=[];
   if(orbPool)reasons.push(`Farm ${reward.orb} orbs: ${orbPool.shortfall} short for ${orbPool.recipients.join(", ")}`);
   if(needsShards)reasons.push(shardShortfall===null?"Shard balance unknown · sync before spending":`${shardShortfall} shards short of the next rarity ascension`);
   if(helpsOwnOrb&&!orbPool)reasons.push(`${ownOrbShort} ${reward.orb} orbs short for this ascension`);
   if(badgeNeeds.length)reasons.push(`Honor badges can help the eligible practical ability goal: ${badgeNeeds.map(row=>`${row.shortfall} ${row.rarity} short`).join(", ")}`);
   if(mythicGoal)reasons.push(`Optional Mythic goal · ${shardShortfall??"unknown"} Mythic shards short`);
   if(unit.utility.mainRaidCore||unit.utility.mainRaidFlex)reasons.push("Selected Raid team");
   else if(unit.utility.incompleteCampaign)reasons.push("Required in unfinished Elite campaign");
   else if(war.has(unit.name))reasons.push(`Active War slot · ability target ${warTarget}`);
   else reasons.push(`${unit.utility.tier} account usefulness`);
   const priority=orbPool?0:needsShards||helpsOwnOrb?1:badgeNeeds.length?2:3;
   // Lack of a campaign source is a tie-breaker, never proof that Onslaught is
   // the only acquisition route. Shared pools are alternatives, not reservations.
   return [{...unit,alliance,reward,reasons,priority,relevance:relevance(unit,war),shardsNeeded,shardBalance,shardShortfall,orbPool,badgeNeeds,
    battles:reward.shards&&shardShortfall!==null?{min:Math.ceil(shardShortfall/reward.shards.max),max:Math.ceil(shardShortfall/reward.shards.min)}:null}];
  }).sort((a,b)=>a.priority-b.priority||a.relevance-b.relevance||Number(a.campaignShardSource)-Number(b.campaignShardSource)||(b.utility.communityScore??0)-(a.utility.communityScore??0)||b.utility.accountPriority-a.utility.accountPriority||(a.shardShortfall??Infinity)-(b.shardShortfall??Infinity)||a.name.localeCompare(b.name)).slice(0,3);
  return {alliance,owned:candidates.filter(unit=>normalizeAlliance(unit.alliance)===alliance).length,deployable:candidates.filter(unit=>normalizeAlliance(unit.alliance)===alliance).length>=5,waveBadges:WAVE_BADGE_ALLIANCE[alliance],rows};
 });
}
