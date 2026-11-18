import {warTierMinimumRank} from "./warReadiness";
import type {WarGearCap} from "./warGear";

type RosterUnit={id:string;name:string;rank:number;faction:string;grandAlliance:string;traits:readonly string[]};
type ObservedGroup={ids:readonly string[];used:number};

/** Fill missing slots without disturbing the observed assignments. */
export function buildWarRosterLineups(
 roster:readonly RosterUnit[], assignedIds:ReadonlySet<string>, targets:readonly WarGearCap[],
 observations:readonly ObservedGroup[],
){
 const pairKey=(a:string,b:string)=>a<b?`${a}|${b}`:`${b}|${a}`;
 const samples=new Map<string,number>();
 for(const {ids,used} of observations){
  if(used<100)continue;
  for(const [index,id] of ids.entries())for(const partner of ids.slice(index+1)){
   if(id===partner)continue;
   const key=pairKey(id,partner);
   samples.set(key,Math.max(samples.get(key)??0,used));
  }
 }
 const repair=(a:RosterUnit,b:RosterUnit)=>a.traits.includes("Mechanic")&&b.traits.includes("Mechanical");
 const revive=(a:RosterUnit,b:RosterUnit)=>a.id==="deathRotbone"&&b.grandAlliance==="Chaos";
 const pairing=(a:RosterUnit,b:RosterUnit)=>{
  const observed=samples.get(pairKey(a.id,b.id))??0;
  return (observed?4+Math.min(3,Math.log10(observed/100)):0)
   +(repair(a,b)||repair(b,a)?8:0)
   +(revive(a,b)||revive(b,a)?8:0)
   +(a.faction&&a.faction===b.faction?1:0);
 };
 const available=new Map(roster.filter(unit=>!assignedIds.has(unit.id)).map(unit=>[unit.id,unit]));
 return targets.slice(0,Math.floor(available.size/5)).map(tier=>{
  const floor=warTierMinimumRank(tier);
  const pool=[...available.values()].sort((a,b)=>b.rank-a.rank||a.id.localeCompare(b.id));
  const ready=pool.filter(unit=>unit.rank>=floor);
  const candidates=ready.length>=5?ready:pool;
  const readiness=(unit:RosterUnit)=>Math.min(unit.rank,floor+2)*0.65-2*Math.max(0,floor-unit.rank);
  const addScore=(unit:RosterUnit,group:RosterUnit[])=>readiness(unit)+group.reduce((sum,other)=>sum+pairing(unit,other),0);
  let best:RosterUnit[]=[];
  let bestScore=-Infinity;
  for(const seed of candidates){
   const group=[seed];
   let score=readiness(seed);
   while(group.length<5){
    let next:RosterUnit|undefined;
    let nextScore=-Infinity;
    for(const unit of candidates){
     if(group.includes(unit))continue;
     const value=addScore(unit,group);
     if(value>nextScore){next=unit;nextScore=value;}
    }
    group.push(next!);
    score+=nextScore;
   }
   if(score>bestScore){best=group;bestScore=score;}
  }
  const reasons:string[]=[];
  let closestPair:{a:string;b:string;used:number}|undefined;
  for(const [index,unit] of best.entries())for(const partner of best.slice(index+1)){
   const used=samples.get(pairKey(unit.id,partner.id))??0;
   if(used>(closestPair?.used??0))closestPair={a:unit.name,b:partner.name,used};
  }
  for(const unit of best){
   const allies=best.filter(other=>other.id!==unit.id&&repair(unit,other));
   if(allies.length)reasons.push(`${unit.name} can repair ${allies.map(ally=>ally.name).join(", ")}.`);
   const reviveTargets=best.filter(other=>other.id!==unit.id&&revive(unit,other));
   if(reviveTargets.length)reasons.push(`${unit.name} can revive adjacent Chaos allies such as ${reviveTargets.map(ally=>ally.name).join(", ")}.`);
  }
  if(closestPair)reasons.push(`${closestPair.a} and ${closestPair.b} appeared together in a source group with ${closestPair.used.toLocaleString()} recorded battles.`);
  if(!reasons.length)reasons.push("Selected for rank and faction fit among the available characters.");
  best.forEach(unit=>available.delete(unit.id));
  return {members:best.map(unit=>unit.name),reasons,tier};
 });
}
