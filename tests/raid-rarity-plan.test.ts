import assert from "node:assert/strict";
import test from "node:test";
import {raidRarityPlan} from "../src/domain/raidRarityPlan";
import {selectedRaidRoadmap} from "../src/domain/raidRoadmap";
const unit=(name:string,index=12,alliance="Imperial",shards=1000)=>({id:name,name,rank:12,rarity:index>=16?"Mythic":index>=12?"Legendary":"Epic",progressionIndex:index,grandAlliance:alliance,shards,mythicShards:20,abilities:[{level:44},{level:44}]});
const roster=()=>[unit("Laviscus",12,"Chaos",154),unit("Kharn",13,"Chaos",234),unit("Trajann",12,"Imperial",88),unit("Kariyan",12,"Imperial",164),unit("Gulgortz",12,"Xenos",255)];
const members=(units:ReturnType<typeof roster>)=>units.map(unit=>({name:unit.name,owned:true,activeTarget:"60",passiveTarget:"60"}));
const inventory={Chaos:[{rarity:"Legendary",amount:16}],Imperial:[{rarity:"Legendary",amount:1}],Xenos:[{rarity:"Legendary",amount:1}]};

test("Laviscus team promotion plan orders Kariyan, Laviscus, Trajann and Kharn; budgets alliances independently",()=>{
 const units=roster(),selected=members(units);
 const plan=raidRarityPlan(selected,units,selectedRaidRoadmap(selected,false),inventory);
 assert.deepEqual(plan.rows.map(row=>row.unit.name),["Kariyan","Laviscus","Trajann","Kharn","Gulgortz"]);
 const lav=plan.rows[1]!;
 assert.equal(lav.next.to,13);assert.equal(lav.next.shards,150);assert.equal(lav.reserved,10);
 assert.match(lav.action,/Promote now/);
 assert.equal(lav.totalShards,900);assert.equal(lav.totalShardShortfall,746);
 assert.equal(lav.totalMythicShards,20);assert.deepEqual(lav.costs,{Legendary:45,Mythic:10});
 assert.equal(plan.rows[0]!.reserved,1);assert.equal(plan.rows[0]!.orbShortfall,9);
 assert.equal(plan.rows[2]!.reserved,0);assert.match(plan.rows[2]!.action,/shards/);
 assert.equal(plan.rows[3]!.reserved,0);assert.equal(plan.rows[3]!.orbShortfall,9);
 assert.equal(plan.rows[4]!.reserved,1);
});

test("only shard-ready next spends reserve shared orbs; a blocked first choice does not starve a ready second",()=>{
 const units=roster();units.find(unit=>unit.name==="Laviscus")!.shards=0;units.find(unit=>unit.name==="Kharn")!.shards=250;
 const plan=raidRarityPlan(members(units),units,[],inventory);
 assert.equal(plan.rows.find(row=>row.unit.name==="Laviscus")!.reserved,0);
 assert.equal(plan.rows.find(row=>row.unit.name==="Kharn")!.reserved,15);
 assert.match(plan.rows.find(row=>row.unit.name==="Kharn")!.action,/Promote now/);
});

test("first Mythic timing is a planning recommendation, with Journey costs and no extra Mythic stars",()=>{
 const units=roster();const kariyan=units.find(unit=>unit.name==="Kariyan")!;kariyan.progressionIndex=15;kariyan.rarity="Legendary";
 const stock={...inventory,Imperial:[{rarity:"Mythic",amount:10}]};
 let plan=raidRarityPlan(members(units),units,[],stock);
 assert.match(plan.rows[0]!.action,/Build rank/);assert.equal(plan.rows[0]!.reserved,0);
 kariyan.rank=17;plan=raidRarityPlan(members(units),units,[],stock);
 assert.equal(plan.rows[0]!.next.shards,0);assert.equal(plan.rows[0]!.next.mythicShards,20);
 assert.equal(plan.rows[0]!.reserved,10);assert.match(plan.rows[0]!.action,/Promote now/);
 kariyan.progressionIndex=16;kariyan.rarity="Mythic";
 assert.equal(raidRarityPlan(members(units),units,[],stock).rows.some(row=>row.unit.name==="Kariyan"),false);
});

test("current checkpoint rarity gates precede long-term Mythic planning and excluded members never enter",()=>{
 const units=roster();units.push({...unit("New support",9),abilities:[{level:26},{level:26}]});
 const selected=members(units),checkpoints=[{number:1,title:"Support abilities",targets:[{name:"New support",passive:36}]}];
 const plan=raidRarityPlan(selected,units,checkpoints,inventory);
 assert.equal(plan.rows[0]!.unit.name,"New support");assert.equal(plan.rows[0]!.goal,12);
 assert.match(plan.rows[0]!.timing,/Before checkpoint 1/);
 selected.find(member=>member.name==="Kharn")!.owned=false;
 assert.equal(raidRarityPlan(selected,units,checkpoints,inventory).rows.some(row=>row.unit.name==="Kharn"),false);
});

test("unknown progression and stock cannot become false spend-ready recommendations",()=>{
 const units=roster();units[0]!.progressionIndex=-1;
 let plan=raidRarityPlan(members(units),units,[],null);
 assert.deepEqual(plan.invalid,["Laviscus"]);assert.equal(plan.rows.some(row=>/Promote now/.test(row.action)),false);
 units[0]!.progressionIndex=12;units[0]!.shards=NaN;
 plan=raidRarityPlan(members(units),units,[],inventory);
 assert.equal(plan.rows.find(row=>row.unit.name==="Laviscus")!.reserved,0);
 assert.match(plan.rows.find(row=>row.unit.name==="Laviscus")!.action,/Sync shard/);
});

test("other archetypes use their own checkpoint gates rather than borrowing the Laviscus ranking",()=>{
 const units=[unit("Ad-Mech damage",12)],selected=members(units);
 const plan=raidRarityPlan(selected,units,[{number:4,title:"Late rank",targets:[{name:"Ad-Mech damage",rank:19}]}],inventory);
 assert.equal(plan.profile,false);assert.equal(plan.rows[0]!.goal,16);
 assert.match(plan.rows[0]!.reason,/no character-specific Mythic order/);
});
