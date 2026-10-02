import assert from "node:assert/strict";
import test from "node:test";
import {nextOrbMilestone,progressionRarity,progressionStep,rarityForGoal} from "../src/domain/characterProgression";
import {orbPlan,orbHonorees,orbsOwned,type OrbCandidate,type OrbOptions} from "../src/domain/orbPlanner";
import {campaignOrbGoals} from "../src/domain/orbCampaignGoals";
import {rateCharacter} from "../src/domain/characterUtility";

export const candidate=(name:string,index=8,overrides:Partial<OrbCandidate>={}):OrbCandidate=>({id:name,name,alliance:"Xenos",progressionIndex:index,rank:9,shards:0,mythicShards:0,campaignGoals:[],utility:rateCharacter({name,communityScore:3,accountPriority:80,mainRaidCore:false,mainRaidFlex:false,raidCore:false,raidFlex:false,warOption:false,incompleteCampaign:false}),...overrides});
const options:OrbOptions={scope:"priorities",horizon:"next",includeMythic:false};
const raid=(name:string,index=8)=>{const row=candidate(name,index);row.utility=rateCharacter({...row.utility,mainRaidCore:true});return row;};

test("orb milestone includes preceding shard promotions and exact Legendary/Mythic steps",()=>{
 assert.deepEqual(nextOrbMilestone(0),{from:2,to:3,shards:40,mythicShards:0,orbs:10,orbRarity:"Uncommon",promotions:2});
 assert.equal(nextOrbMilestone(3)?.shards,50);
 assert.equal(nextOrbMilestone(6)?.shards,120);
 assert.equal(nextOrbMilestone(9)?.shards,250);
 assert.deepEqual([12,13,14,15,16,17,18].map(index=>{const step=progressionStep(index)!;return [step.shards,step.mythicShards,step.orbs];}),[[150,0,10],[250,0,15],[500,0,20],[0,20,10],[0,30,10],[0,50,15],[0,100,25]]);
 assert.equal(progressionRarity(15),"Legendary");assert.equal(progressionRarity(16),"Mythic");
 assert.equal(nextOrbMilestone(19),null);assert.equal(progressionRarity(20),null);assert.equal(nextOrbMilestone(-1),null);
 assert.equal(rarityForGoal(12,35),"Epic");assert.equal(rarityForGoal(13,35),"Legendary");
});

test("scarce alliance pools reserve once in priority order; other alliances stay independent",()=>{
 const core=raid("Core"),flex=raid("Flex");flex.utility=rateCharacter({...flex.utility,mainRaidCore:false,mainRaidFlex:true});
 const campaign=candidate("Campaign",8,{campaignGoals:[{campaign:"Test",rank:12,ability:null,progressKnown:true}]});
 const chaos=candidate("Chaos",8,{alliance:"Chaos"});
 const result=orbPlan([campaign,flex,chaos,core],{Xenos:[{rarity:"Epic",amount:12}],Chaos:[{rarity:"Epic",amount:10}]},new Map(),options);
 assert.deepEqual(result.rows.map(row=>[row.name,row.allocations[0]?.reserved,row.allocations[0]?.shortfall]),[["Core",10,0],["Flex",2,8],["Campaign",0,10],["Chaos",10,0]]);
 assert.equal(result.pools.find(pool=>pool.alliance==="Xenos")?.shortfall,18);
});

test("War caps prevent usefulness from promoting capped units; campaign and Raid retain independent reasons",()=>{
 const capped=candidate("Capped",9),silver=candidate("Silver",6),gold=candidate("Gold",8);
 const campaign=candidate("Campaign",9,{campaignGoals:[{campaign:"Cadia",rank:14,ability:35,progressKnown:false}]});
 const core=raid("Core",9);
 const result=orbPlan([capped,silver,gold,campaign,core],{},new Map([["Capped",35],["Silver",26],["Gold",35],["Campaign",35],["Core",35]]),options);
 assert.deepEqual(result.rows.map(row=>row.name),["Core","Campaign","Gold"]);
 assert.match(result.rows[1]!.reasons[0]!,/completion unknown/);
 const warOnly=orbPlan([capped,silver,gold,campaign,core],{},new Map([["Capped",35],["Silver",26],["Gold",35]]),{...options,scope:"war"});
 assert.deepEqual(warOnly.rows.map(row=>row.name),["Gold"]);
});

test("whole-goal totals retain every orb rarity and shard prerequisite instead of budgeting only the last tier",()=>{
 const row=orbPlan([raid("Core",0)],{},new Map(),{...options,horizon:"goal"}).rows[0]!;
 assert.equal(row.end,12);assert.equal(row.shardsNeeded,460);
 assert.deepEqual(row.costs,{Uncommon:10,Rare:10,Epic:10,Legendary:10});
 assert.equal(row.next.promotions,2);
});

test("Mythic is opt-in and costs Mythic shards while invalid progression/alliance and absent inventory stay unknown",()=>{
 const wing=raid("Wing",15),mythic=raid("Mythic",16),invalid=candidate("Unknown",50),noAlliance=candidate("No alliance",8,{alliance:""});
 assert.equal(orbPlan([wing,mythic],null,new Map(),options).rows.length,0);
 const result=orbPlan([wing,mythic,invalid,noAlliance],null,new Map(),{...options,includeMythic:true});
 assert.equal(result.rows.length,2);assert.equal(result.rows[0]!.mythicShardsNeeded,30);assert.equal(result.rows[0]!.shardsNeeded,0);
 assert.equal(result.pools[0]!.owned,null);assert.equal(result.pools[0]!.shortfall,null);
 assert.deepEqual(result.unknown,["Unknown","No alliance"]);
 assert.equal(orbsOwned({Imperium:[{rarity:"Rare",amount:3}],Imperial:[{rarity:"Rare",amount:2}]},"Imperial","Rare"),5);
 assert.equal(orbsOwned({Xenos:[{rarity:"Rare",amount:-1}]},"Xenos","Rare"),null);
});

test("Onslaught honors use the current stage and alliance, excluding Legendary star from Legendary orb farming",()=>{
 const rows=[candidate("Epic donor",8),candidate("Wrong stage",7),candidate("Legendary donor",12),candidate("Wing",15),candidate("Chaos",8,{alliance:"Chaos"})];
 assert.deepEqual(orbHonorees(rows,"Xenos","Epic"),["Epic donor"]);
 assert.deepEqual(orbHonorees(rows,"Xenos","Legendary"),["Legendary donor"]);
 assert.deepEqual(orbHonorees(rows,"Xenos","Rare"),[]);
 assert.deepEqual(orbHonorees(rows,"Xenos","Mythic"),["Wing"]);
});


test("campaign orb floors use practical ability stops, suppress low confidence and completed campaigns, and label missing progress",()=>{
 const targets={_meta:{},campaigns:{Test:{status:"reviewed",characters:{Carry:{rank:"Gold I",active:"35-50",confidence:"medium"},Speculative:{rank:"Diamond I",confidence:"low"}}}}};
 const battles=[{campaign:"Test Elite",campaignType:"Elite",nodeNumber:40}];
 assert.deepEqual(campaignOrbGoals("Carry",targets,undefined,battles),[{campaign:"Test",rank:12,ability:35,progressKnown:false}]);
 assert.deepEqual(campaignOrbGoals("Speculative",targets,undefined,battles),[]);
 assert.deepEqual(campaignOrbGoals("Carry",targets,[{name:"Test",type:"Elite",highestCompletedBattle:40}],battles),[]);
 assert.equal(campaignOrbGoals("Carry",targets,[{name:"Test",type:"Elite",highestCompletedBattle:39}],battles)[0]?.progressKnown,true);
});
