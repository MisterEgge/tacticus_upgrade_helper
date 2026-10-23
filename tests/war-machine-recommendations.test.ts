import assert from "node:assert/strict";
import test from "node:test";
import {defenseMachineFits,recommendDefenseMachines,type DefenseMachineTeam} from "../src/domain/warMachineRecommendations";
import {RAID_MACHINES} from "../src/domain/raidMachine";

const machines=RAID_MACHINES.map(machine=>({...machine,active:1,passive:1}));
const team=(name:string,traits:string[]=[],faction=""):DefenseMachineTeam=>({name,tier:"silver",members:Array.from({length:5},(_,i)=>({id:`${name}-${i}`,traits,faction}))});
test("machine fit checks real eligible teammates and does not assume Mythic or universal contamination synergy",()=>{
 const ordinary=team("ordinary"),mechs=team("mechs",["Mechanical"]),mixed={...mechs,members:[...mechs.members.slice(0,4),ordinary.members[0]!]};
 const ids=(value:DefenseMachineTeam)=>defenseMachineFits(value,machines).map(fit=>fit.id);
 assert.ok(!ids(ordinary).includes("necroReanimator"));
 assert.ok(ids(mechs).includes("necroReanimator"));
 assert.ok(ids(mechs).includes("deathCrawler"));
 assert.ok(!ids(mixed).includes("deathCrawler"));
 assert.ok(ids(team("nurgle",["ContagionsOfNurgle"])).includes("deathCrawler"));
 assert.ok(ids(team("orks",[],"Orks")).includes("orksRukkatrukk"));
 assert.ok(!ids(ordinary).includes("orksRukkatrukk"));
 assert.ok(ids(team("psykers",["Psyker"])).includes("thousDaemonPrince"));
 assert.ok(!ids(ordinary).includes("thousDaemonPrince"));
 assert.ok(ids(team("overwatch",["Overwatch"])).includes("darkaStormSpeeder"));
});
test("allocation reserves scarce synergy across all five teams and returns owned, unique choices",()=>{
 const teams=[team("ordinary"),team("mechs",["Mechanical"]),team("orks",[],"Orks"),team("psykers",["Psyker"]),team("nurgle",["ContagionsOfNurgle"])];
 const result=recommendDefenseMachines(teams,machines);
 assert.equal(Object.keys(result).length,5);
 assert.equal(new Set(Object.values(result).map(fit=>fit.id)).size,5);
 assert.equal(result.mechs?.id,"necroReanimator");
 assert.equal(result.orks?.id,"orksRukkatrukk");
 assert.equal(result.nurgle?.id,"deathCrawler");
 assert.deepEqual(recommendDefenseMachines([...teams].reverse(),[...machines].reverse()),result);
 const onlyBio=machines.filter(machine=>machine.id==="tyranBiovore");
 assert.equal(Object.keys(recommendDefenseMachines(teams,onlyBio)).length,1);
 assert.deepEqual(recommendDefenseMachines(teams,[]),{});
});
test("manual selections stay pinned, invalid saves cannot consume a machine, and unknown machines are not recommended",()=>{
 const teams=[team("first"),team("second")],pins={first:"tyranBiovore"};
 const result=recommendDefenseMachines(teams,machines,pins);
 assert.equal(result.first,undefined);
 assert.ok(result.second);
 assert.notEqual(result.second.id,"tyranBiovore");
 assert.deepEqual(pins,{first:"tyranBiovore"});
 assert.deepEqual(recommendDefenseMachines(teams,[{id:"unknown",name:"Unknown",active:60,passive:60}]),{});
 assert.deepEqual(recommendDefenseMachines(teams,machines,{first:"not-owned"}),recommendDefenseMachines(teams,machines));
});
test("levels affect readiness without giving an incompatible machine a fit",()=>{
 const ordinary=team("ordinary"),low=defenseMachineFits(ordinary,machines);
 const high=defenseMachineFits(ordinary,machines.map(machine=>({...machine,active:60,passive:60})));
 assert.ok(high.find(fit=>fit.id==="tyranBiovore")!.score>low.find(fit=>fit.id==="tyranBiovore")!.score);
 assert.ok(!high.some(fit=>fit.id==="necroReanimator"));
 assert.deepEqual(defenseMachineFits(ordinary,machines.map(machine=>({...machine,active:26,passive:26}))),high);
});
