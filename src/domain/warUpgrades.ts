import {warTeamIdentity} from "./warTeamIdentity";
import {warTierMinimumRank} from "./warReadiness";
import {RANK_NAMES} from "./ranks";

export type WarSide = "defense" | "offense";
export type WarUpgradeUnit = {id:string;name:string;rank:number;rarity:string};
export type WarUpgradeObservation = {used:number;rate:number};
export type WarUpgradeSource = WarUpgradeObservation & {
    key:string;side:WarSide;kind:"core"|"lineup";core:string[];
    flex:Array<WarUpgradeObservation & {id:string}>;
};
export type WarUpgradePlan = {
    key:string;side:WarSide;kind:"core"|"lineup";used:number;rate:number;
    core:string[];members:string[];flex:WarUpgradeSource["flex"];blockers:string[];
    rankSteps:number;quality:number;score:number;
};
export type WarUpgradeRecommendation = {unit:WarUpgradeUnit;targetRank:number;plan:WarUpgradePlan;alternatives:WarUpgradePlan[]};
const MIN_SAMPLES=100;
const valid=(row:WarUpgradeObservation)=>Number.isSafeInteger(row.used)&&row.used>=MIN_SAMPLES&&Number.isFinite(row.rate)&&row.rate>=0&&row.rate<=100;

/** A ranking signal from the reported rate/sample, never a predicted team win rate. */
export function warEvidenceConfidence(row:WarUpgradeObservation):number {
    if(!valid(row))return 0;
    const p=row.rate/100,z=1.96,n=row.used,z2=z*z;
    return (p+z2/(2*n)-z*Math.sqrt(p*(1-p)/n+z2/(4*n*n)))/(1+z2/n);
}

export function warUpgradeRecommendations(roster:readonly WarUpgradeUnit[],sources:readonly WarUpgradeSource[],tier:"silver"|"gold",side:WarSide):WarUpgradeRecommendation[] {
    const units=new Map(roster.filter(unit=>Number.isInteger(unit.rank)&&unit.rank>=0&&unit.rank<RANK_NAMES.length).map(unit=>[unit.id,unit]));
    const targetRank=warTierMinimumRank(tier);
    const plans:WarUpgradePlan[]=[];
    for(const source of sources){
        if(source.side!==side||!valid(source)||source.rate===0||new Set(source.core).size!==source.core.length||source.core.some(id=>!units.has(id)))continue;
        if(source.kind==="lineup"&&source.core.length!==5||source.kind==="core"&&source.core.length!==3)continue;
        const combinations:Array<WarUpgradeSource["flex"]>=[];
        if(source.kind==="lineup")combinations.push([]);
        else {
            const seen=new Set(source.core);
            const flex=source.flex.filter(choice=>{
                if(!units.has(choice.id)||seen.has(choice.id)||!valid(choice))return false;
                seen.add(choice.id);return true;
            });
            for(let first=0;first<flex.length;first++)for(let second=first+1;second<flex.length;second++)combinations.push([flex[first]!,flex[second]!]);
        }
        const options=combinations.map(flex=>{
            const members=[...source.core,...flex.map(choice=>choice.id)];
            const blockers=members.filter(id=>units.get(id)!.rank<targetRank);
            const rankSteps=blockers.reduce((sum,id)=>sum+targetRank-units.get(id)!.rank,0);
            // Flex cohorts overlap: combine confidence signals only for ordering,
            // not their percentages, samples or outcomes for display.
            const quality=source.kind==="lineup"?warEvidenceConfidence(source):
                warEvidenceConfidence(source)*0.7+Math.min(...flex.map(warEvidenceConfidence))*0.3;
            return {key:source.key,side,kind:source.kind,used:source.used,rate:source.rate,core:source.core,members,flex,blockers,rankSteps,quality,
                score:quality/(1+rankSteps/6)} satisfies WarUpgradePlan;
        });
        const readyQuality=Math.max(-1,...options.filter(plan=>plan.blockers.length===0).map(plan=>plan.quality));
        plans.push(...options.filter(plan=>plan.blockers.length>0&&plan.quality>readyQuality+1e-9));
    }
    // Prefer measured five-character evidence when the same five also appear
    // as a core plus flex suggestion. Do not add overlapping samples together.
    const distinct=new Map<string,WarUpgradePlan>();
    for(const plan of plans){
        const key=[...plan.members].sort().join("|");
        const current=distinct.get(key);
        if(!current||plan.kind==="lineup"&&current.kind!=="lineup"||plan.kind===current.kind&&plan.quality>current.quality)distinct.set(key,plan);
    }
    const compare=(a:WarUpgradePlan,b:WarUpgradePlan)=>b.score-a.score||a.blockers.length-b.blockers.length||b.quality-a.quality||a.rankSteps-b.rankSteps||b.used-a.used||a.key.localeCompare(b.key)||a.members.join("|").localeCompare(b.members.join("|"));
    const byCharacter=new Map<string,WarUpgradePlan[]>();
    for(const plan of distinct.values())for(const id of plan.blockers){const options=byCharacter.get(id)??[];options.push(plan);byCharacter.set(id,options);}
    return [...byCharacter].map(([id,options])=>{
        options.sort(compare);
        return {unit:units.get(id)!,targetRank,plan:options[0]!,alternatives:options.slice(1)};
    }).sort((a,b)=>compare(a.plan,b.plan)||(targetRank-a.unit.rank)-(targetRank-b.unit.rank)||a.unit.name.localeCompare(b.unit.name));
}

/** Snapshot membership is only used to describe reassignments, never as win-rate evidence. */
export function warUpgradeAssignments(saved:unknown,side:WarSide,defaults:string[][],owned:ReadonlySet<string>):string[][] {
    if(!saved||typeof saved!=="object")return defaults;
    const lineups=(saved as {lineups?:unknown}).lineups;
    if(!lineups||typeof lineups!=="object")return defaults;
    const slots=(lineups as Record<string,unknown>)[side];
    if(!Array.isArray(slots)||slots.length>(side==="defense"?5:10))return defaults;
    const groups:string[][]=[];
    for(const slot of slots){
        if(slot===null)continue;
        if(!slot||typeof slot!=="object")return defaults;
        const row=slot as {core?:unknown;flex?:unknown};
        if(!Array.isArray(row.core)||!Array.isArray(row.flex))return defaults;
        const ids=[...row.core,...row.flex].map(unit=>unit&&typeof unit==="object"?(unit as {id?:unknown}).id:null);
        if(ids.length!==5||!ids.every((id):id is string=>typeof id==="string"&&owned.has(id))||new Set(ids).size!==5)return defaults;
        groups.push(ids);
    }
    const ids=groups.flat();
    return new Set(ids).size===ids.length?groups:defaults;
}

export function warUpgradeReassignments(plan:WarUpgradePlan,assignments:readonly string[][]):number {
    return assignments.filter(group=>group.some(id=>plan.members.includes(id))&&!(group.length===5&&group.every(id=>plan.members.includes(id)))).length;
}

export type WarUpgradeTeam={id:string;name:string;plan:WarUpgradePlan;upgrades:WarUpgradeRecommendation[]};
/** Preserve each character's other team opportunities, but list it once per core. */
export function groupWarUpgrades(recommendations:readonly WarUpgradeRecommendation[],roster:readonly WarUpgradeUnit[]):WarUpgradeTeam[]{
 const units=new Map(roster.map(unit=>[unit.id,unit]));
 const groups=new Map<string,WarUpgradeTeam>();
 for(const row of recommendations)for(const plan of [row.plan,...row.alternatives]){
  const identity=warTeamIdentity(plan.core.map(id=>units.get(id)!),plan.kind);
  let group=groups.get(identity.id);
  if(!group){group={...identity,plan,upgrades:[]};groups.set(identity.id,group);}
  if(plan.score>group.plan.score)group.plan=plan;
  const previous=group.upgrades.find(upgrade=>upgrade.unit.id===row.unit.id);
  if(!previous)group.upgrades.push({...row,plan,alternatives:[]});
  else if(plan.score>previous.plan.score)previous.plan=plan;
 }
 for(const group of groups.values())group.upgrades.sort((a,b)=>Number(group.plan.core.includes(b.unit.id))-Number(group.plan.core.includes(a.unit.id))||a.unit.name.localeCompare(b.unit.name));
 return [...groups.values()].sort((a,b)=>b.plan.score-a.plan.score||a.id.localeCompare(b.id));
}
