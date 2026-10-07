import assert from "node:assert/strict";
import test from "node:test";
import {nextOrbMilestone,progressionLabel,progressionRarity,progressionStep,rarityForGoal} from "../src/domain/characterProgression";
import {orbPlan,orbUpgradeAction,shardReadyOrbPlan,combinedOrbDemand,orbHonorees,orbsOwned,type OrbCandidate,type OrbOptions} from "../src/domain/orbPlanner";
import {campaignOrbGoals} from "../src/domain/orbCampaignGoals";
import {rateCharacter} from "../src/domain/characterUtility";

export const candidate=(name:string,index=8,overrides:Partial<OrbCandidate>={}):OrbCandidate=>({id:name,name,alliance:"Xenos",progressionIndex:index,rank:9,shards:0,mythicShards:0,campaignGoals:[],utility:rateCharacter({name,communityScore:3,accountPriority:80,mainRaidCore:false,mainRaidFlex:false,raidCore:false,raidFlex:false,warOption:false,incompleteCampaign:false}),...overrides});
const options:OrbOptions={scope:"priorities",horizon:"next",includeMythic:false,includeShardBlocked:true};
const raid=(name:string,index=8)=>{const row=candidate(name,index);row.utility=rateCharacter({...row.utility,mainRaidCore:true});return row;};

test("Forcas cannot enter an orb recommendation or reserve a shared pool until the full shard cost is covered",()=>{
 const forcas=candidate("Forcas",8,{id:"darkaCompanion",alliance:"Imperial",shards:45});
 const covered=candidate("Covered Imperial",8,{alliance:"Imperial",shards:50});
 const defaultOptions:OrbOptions={scope:"all",horizon:"next",includeMythic:false};
 const inventory={Imperial:[{rarity:"Epic",amount:10}]};
 const result=orbPlan([forcas,covered],inventory,new Map(),defaultOptions);
 assert.deepEqual(result.rows.map(row=>row.name),["Covered Imperial"]);
 assert.deepEqual(result.deferred,["Forcas"]);
 assert.equal(result.pools[0]?.needed,10);assert.equal(result.pools[0]?.shortfall,0);
 assert.equal(result.rows[0]?.allocations[0]?.reserved,10);
 assert.equal(shardReadyOrbPlan([forcas],inventory,new Map(),false).rows.length,0);
 const future=orbPlan([forcas],{},new Map(),{...defaultOptions,includeShardBlocked:true});
 assert.equal(future.rows[0]?.shardShortfall,5);
 assert.equal(orbUpgradeAction(future.rows[0]!),"Collect missing shards first.");
 const unlocked=orbPlan([{...forcas,shards:50}],{},new Map(),defaultOptions);
 assert.equal(unlocked.rows.length,1);assert.equal(orbUpgradeAction(unlocked.rows[0]!),"Collect missing orbs.");
 for(const shards of [null,NaN,-1])assert.equal(orbPlan([{...forcas,shards}],inventory,new Map(),defaultOptions).rows.length,0);
 const unknown=orbPlan([{...forcas,shards:null}],{},new Map(),{...defaultOptions,includeShardBlocked:true});
 assert.equal(orbUpgradeAction(unknown.rows[0]!),"Sync shard inventory first.");
});

test("shard gating covers intervening promotions, full goals and the correct Mythic shard balance",()=>{
 const defaults:OrbOptions={scope:"all",horizon:"next",includeMythic:true};
 assert.equal(orbPlan([candidate("Only promotion ready",7,{shards:40})],{},new Map(),defaults).rows.length,0);
 assert.equal(orbPlan([candidate("Whole path ready",7,{shards:90})],{},new Map(),defaults).rows.length,1);
 const legend=raid("Whole goal",8);legend.shards=50;
 assert.equal(orbPlan([legend],{},new Map(),{...defaults,horizon:"goal"}).rows.length,0);
 assert.equal(orbPlan([{...legend,shards:300}],{},new Map(),{...defaults,horizon:"goal"}).rows.length,1);
 const mythic=candidate("Mythic ascension",15,{shards:999,mythicShards:19});
 assert.equal(orbPlan([mythic],{},new Map(),defaults).rows.length,0);
 assert.equal(orbPlan([{...mythic,shards:null,mythicShards:20}],{},new Map(),defaults).rows.length,1);
});

test("progression labels use visible game stars and retain counts across rarity ascensions",()=>{
 assert.deepEqual(Array.from({length:20},(_,index)=>progressionLabel(index)),[
  "Common · no stars","Common · 1 yellow star","Common · 2 yellow stars",
  "Uncommon · 2 yellow stars","Uncommon · 3 yellow stars","Uncommon · 4 yellow stars",
  "Rare · 4 yellow stars","Rare · 5 yellow stars","Rare · 1 red star",
  "Epic · 1 red star","Epic · 2 red stars","Epic · 3 red stars",
  "Legendary · 3 red stars","Legendary · 4 red stars","Legendary · 5 red stars","Legendary · 1 blue star",
  "Mythic · 1 blue star","Mythic · 2 blue stars","Mythic · 3 blue stars","Mythic · wings"
 ]);
 for(const index of [-1,20,1.5,NaN])assert.equal(progressionLabel(index),"Unknown progression");
});

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
 const result=orbPlan([wing,mythic,invalid,noAlliance],null,new Map(),{...options,includeMythic:true,includeStarUpgrades:true});
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

test("shard-ready totals include each alliance and allocate only the ready queue once",()=>{
 const blocked=raid("Blocked Raid");
 const ready=candidate("Ready",8,{shards:50});
 const second=candidate("Second",8,{shards:80});
 const imperial=candidate("Imperial",5,{shards:20,alliance:"Imperium"});
 const chaos=candidate("Chaos",11,{shards:500,alliance:"Chaos"});
 const result=shardReadyOrbPlan([blocked,ready,second,imperial,chaos],{Xenos:[{rarity:"Epic",amount:12}],Imperial:[{rarity:"Rare",amount:7}],Chaos:[{rarity:"Legendary",amount:10}]},new Map([["Ready",26]]),false);
 assert.equal(result.waitingForShards,1);
 assert.equal(result.rows.some(row=>row.name==="Blocked Raid"),false);
 assert.deepEqual(result.rows.filter(row=>row.alliance==="Xenos").map(row=>row.allocations[0]?.reserved),[10,2]);
 assert.deepEqual(result.pools.map(pool=>[pool.alliance,pool.rarity,pool.needed,pool.shortfall]),[["Imperial","Rare",10,3],["Xenos","Epic",20,8],["Chaos","Legendary",10,0]]);
 assert.equal(result.rows.find(row=>row.name==="Chaos")?.end,12);
 const future=orbPlan([ready,blocked],{},new Map(),options);
 assert.equal(combinedOrbDemand(result,future).get("Xenos:Epic"),30);
});

test("shard-ready ascensions require the whole intervening promotion path and preserve unknown shards",()=>{
 const result=shardReadyOrbPlan([candidate("Promote first",7,{shards:90}),candidate("Only next promotion",7,{shards:40}),candidate("Unknown",8,{shards:null}),candidate("Maxed",19,{shards:999})],null,new Map(),false);
 assert.deepEqual(result.rows.map(row=>row.name),["Promote first"]);
 assert.equal(result.rows[0]?.next.promotions,1);
 assert.equal(result.rows[0]?.shardsNeeded,90);
 assert.equal(result.rows[0]?.allocations[0]?.reserved,null);
 assert.equal(result.pools[0]?.shortfall,null);
 assert.equal(result.waitingForShards,1);
 assert.deepEqual(result.unknownShards,["Unknown"]);
});

test("Mythic readiness uses Mythic shards and opt-in; spent shards remove a character from totals",()=>{
 const row=candidate("Wing",15,{shards:null,mythicShards:20});
 assert.equal(shardReadyOrbPlan([row],{},new Map(),false).rows.length,0);
 assert.equal(shardReadyOrbPlan([row],{},new Map(),true).pools[0]?.needed,10);
 assert.deepEqual(shardReadyOrbPlan([{...row,mythicShards:null}],{},new Map(),true).unknownShards,["Wing"]);
 const before=candidate("Ascend",8,{shards:50});
 assert.equal(shardReadyOrbPlan([before],{},new Map(),false).rows.length,1);
 assert.equal(shardReadyOrbPlan([{...before,progressionIndex:9,shards:0}],{},new Map(),false).rows.length,0);
});


test("campaign orb floors use practical ability stops, suppress low confidence and completed campaigns, and label missing progress",()=>{
 const targets={_meta:{},campaigns:{Test:{status:"reviewed",characters:{Carry:{rank:"Gold I",active:"35-50",confidence:"medium"},Speculative:{rank:"Diamond I",confidence:"low"}}}}};
 const battles=[{campaign:"Test Elite",campaignType:"Elite",nodeNumber:40}];
 assert.deepEqual(campaignOrbGoals("Carry",targets,undefined,battles),[{campaign:"Test",rank:12,ability:35,progressKnown:false}]);
 assert.deepEqual(campaignOrbGoals("Speculative",targets,undefined,battles),[]);
 assert.deepEqual(campaignOrbGoals("Carry",targets,[{name:"Test",type:"Elite",highestCompletedBattle:40}],battles),[]);
 assert.equal(campaignOrbGoals("Carry",targets,[{name:"Test",type:"Elite",highestCompletedBattle:39}],battles)[0]?.progressKnown,true);
});

test("rarity ascensions exclude extra Legendary and Mythic stars unless explicitly enabled",()=>{
 const ascends=candidate("Epic to Legendary",11,{shards:100});
 const stars=candidate("Legendary three stars",13,{shards:250});
 const mythicStars=candidate("Mythic stars",16,{mythicShards:30});
 const roster=[ascends,stars,mythicStars];
 const defaultPlan=shardReadyOrbPlan(roster,{},new Map(),true);
 assert.deepEqual(defaultPlan.rows.map(row=>row.name),["Epic to Legendary"]);
 assert.equal(defaultPlan.pools[0]?.needed,10);
 const expanded=shardReadyOrbPlan(roster,{},new Map(),true,true);
 assert.equal(expanded.rows.length,3);
 assert.equal(expanded.pools.find(pool=>pool.rarity==="Legendary")?.needed,25);
 assert.equal(expanded.pools.find(pool=>pool.rarity==="Mythic")?.needed,10);
 assert.equal(orbPlan([stars],{},new Map(),{...options,scope:"all"}).rows.length,0);
 assert.equal(orbPlan([stars],{},new Map(),{...options,scope:"all",includeStarUpgrades:true}).rows.length,1);
});
