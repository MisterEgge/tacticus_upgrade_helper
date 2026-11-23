import assert from "node:assert/strict";
import test from "node:test";
import {DEFAULT_PRIORITIES, parsePlayerPriorities, characterPlanningPriority,priorityWithWarSelection} from "../src/domain/playerPriorities";
import {allocateEquipmentActions} from "../src/domain/equipmentActions";
import {rankAccountActions} from "../src/domain/dashboard";
import {orbPlan, type OrbCandidate} from "../src/domain/orbPlanner";
import {rateCharacter} from "../src/domain/characterUtility";
import {gearRoles} from "../src/domain/legendaryReallocation";

test("priorities validate distinct bounded choices and preserve deliberately empty modes", () => {
    assert.deepEqual(parsePlayerPriorities(DEFAULT_PRIORITIES), DEFAULT_PRIORITIES);
    assert.deepEqual(parsePlayerPriorities({version:1,modes:[],characters:[]}),{version:1,modes:[],characters:[]});
    for (const value of [null,{}, {version:2,modes:[],characters:[]}, {version:1,modes:["raid","raid"],characters:[]}, {version:1,modes:["unknown"],characters:[]}, {version:1,modes:[],characters:["a","a"]}, {version:1,modes:[],characters:["../secret"]}, {version:1,modes:[],characters:Array.from({length:31},(_,i)=>`unit${i}`)}]) assert.equal(parsePlayerPriorities(value),null);
});

test("mode order, exclusion and ordered pins determine a character's strongest active priority", () => {
    const campaign=characterPlanningPriority(DEFAULT_PRIORITIES,"campaign",["campaign"]);
    const raid=characterPlanningPriority(DEFAULT_PRIORITIES,"raid",["raid"]);
    assert.ok(campaign>raid);
    assert.equal(characterPlanningPriority(DEFAULT_PRIORITIES,"both",["campaign","raid"]),campaign);
    const raidOnly={version:1 as const,modes:["raid" as const],characters:["pin1","pin2"]};
    assert.equal(characterPlanningPriority(raidOnly,"campaign",["campaign"]),0);
    assert.ok(characterPlanningPriority(raidOnly,"pin1",[])>characterPlanningPriority(raidOnly,"pin2",[]));
    assert.ok(characterPlanningPriority(raidOnly,"pin2",[])>characterPlanningPriority(raidOnly,"raid",["raid"]));
});

test("campaign-first allocation reserves a scarce ready copy before a Raid recipient", () => {
    const candidates=[{character:"Raid",slotId:"Slot2",state:"EQUIP NOW",itemRarity:"Epic",accountPriority:100,raidPriority:true,planningPriority:20000,acquisition:[{id:"shared"}]},
        {character:"Campaign",slotId:"Slot2",state:"NEED",itemRarity:"Epic",accountPriority:1,raidPriority:false,planningPriority:30000,acquisition:[{id:"shared"}]}];
    const result=allocateEquipmentActions(candidates,[{id:"shared",amount:1,level:9}]);
    assert.equal(result.find(row=>row.character==="Campaign")!.state,"EQUIP NOW");
    assert.equal(result.find(row=>row.character==="Raid")!.state,"NEED");
    const raidFirst=allocateEquipmentActions(candidates.map(row=>({...row,planningPriority:row.raidPriority?30000:0})),[{id:"shared",amount:1,level:9}]);
    assert.equal(raidFirst.find(row=>row.character==="Raid")!.state,"EQUIP NOW");
});

test("dashboard excludes inactive modes and ranks configured priorities before action readiness", () => {
    const rows=[{name:"Raid",actions:[{ready:true}]},{name:"Campaign",actions:[{ready:false}]},{name:"Bench",actions:[{ready:true}]}];
    assert.deepEqual(rankAccountActions(rows,new Set(["Raid"]),{Campaign:30000,Raid:20000,Bench:0}).map(row=>row.name),["Campaign","Raid"]);
});
test("browser War selections replace default War membership without removing overlapping campaign or pinned roles",()=>{
    const utility={planningPriority:10000,planningModes:["campaign","raid","war"] as const,planningRoles:["war"] as const};
    const mutable={...utility,planningModes:[...utility.planningModes],planningRoles:[...utility.planningRoles]};
    assert.equal(priorityWithWarSelection(mutable,false),0);
    assert.equal(priorityWithWarSelection({...mutable,planningPriority:0,planningRoles:[]},true),10000);
    assert.equal(priorityWithWarSelection({...mutable,planningRoles:["campaign","war"]},false),30000);
    assert.equal(priorityWithWarSelection({...mutable,pinned:true,planningPriority:43000},false),43000);
});

const candidate=(name:string,raid:boolean,score:number):OrbCandidate=>({id:name,name,alliance:"Imperial",rank:6,progressionIndex:5,shards:500,mythicShards:0,
    utility:{...rateCharacter({name,communityScore:4,accountPriority:100,mainRaidCore:raid,mainRaidFlex:false,raidCore:raid,raidFlex:false,warOption:false,incompleteCampaign:!raid}),planningPriority:score,planningModes:["campaign","raid","war"]},
    campaignGoals:raid?[]:[{campaign:"Test",rank:9,ability:26,progressKnown:true}]});
test("orb reservations follow personal order, disabled modes stay out, explicit audits stay available",()=>{
    const rows=[candidate("Raid",true,20000),candidate("Campaign",false,30000)];
    const plan=orbPlan(rows,{Imperial:[{rarity:"Rare",amount:10}]},new Map(),{scope:"priorities",includeMythic:false,horizon:"next"});
    assert.deepEqual(plan.rows.map(row=>row.name),["Campaign","Raid"]);
    assert.equal(plan.rows[0]!.allocations[0]!.reserved,10);
    assert.equal(plan.rows[1]!.allocations[0]!.reserved,0);
    rows[1]!.utility.planningPriority=0;
    assert.deepEqual(orbPlan(rows,null,new Map(),{scope:"priorities",includeMythic:false,horizon:"next"}).rows.map(row=>row.name),["Raid"]);
    assert.equal(orbPlan(rows,null,new Map(),{scope:"all",includeMythic:false,horizon:"next"}).rows.length,2);
});
test("a disabled Raid goal cannot extend a shared campaign character's orb target",()=>{
    const row=candidate("Both",true,30000);
    row.utility.planningModes=["campaign"];
    row.campaignGoals=[{campaign:"Test",rank:6,ability:26,progressKnown:true}];
    const plan=orbPlan([row],null,new Map(),{scope:"priorities",includeMythic:false,horizon:"goal"});
    assert.equal(plan.rows[0]!.end,6);
});
test("a pin without a mode target budgets its next orb milestone rather than inventing a Legendary target",()=>{
    const row=candidate("Pin",false,43000);row.campaignGoals=[];row.utility.pinned=true;row.utility.planningModes=[];
    const plan=orbPlan([row],null,new Map(),{scope:"priorities",includeMythic:false,horizon:"goal"});
    assert.equal(plan.rows[0]!.end,6);
});
test("transfer priorities change recipient order without lifting unknown-campaign donor protection",()=>{
    const roles=gearRoles({raidNames:["Raid"],raidOptions:[],warNames:[],campaignNames:["Campaign"],campaignUnknown:["Unknown"],focus:{},planningScores:{Raid:20000,Campaign:30000,Unknown:30000,Pin:43000}});
    assert.ok(roles.get("Campaign")!.priority>roles.get("Raid")!.priority);
    assert.equal(roles.get("Unknown")!.donationBlocked,true);
    assert.equal(roles.get("Pin")!.label,"Pinned character");
});
