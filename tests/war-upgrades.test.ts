import assert from "node:assert/strict";
import test from "node:test";
import {warUpgradeRecommendations,warEvidenceConfidence,warUpgradeAssignments,warUpgradeReassignments,type WarUpgradeSource,type WarUpgradeUnit} from "../src/domain/warUpgrades";

const group=(key="A",side:"defense"|"offense"="defense"):WarUpgradeSource=>({key,side,kind:"core",core:[`${key}1`,`${key}2`,`${key}3`],used:1000,rate:90,flex:[{id:`${key}4`,used:1000,rate:92},{id:`${key}5`,used:1000,rate:90}]});
const roster=(groups:WarUpgradeSource[],rank=9):WarUpgradeUnit[]=>[...new Set(groups.flatMap(source=>[...source.core,...source.flex.map(choice=>choice.id)]))].map(id=>({id,name:id,rank,rarity:"Rare"}));

test("one Bronze upgrade can complete a fully owned Silver lineup; already-ready members stay out",()=>{
    const source=group(),units=roster([source]);units[0]!.rank=7;
    const result=warUpgradeRecommendations(units,[source],"silver","defense");
    assert.deepEqual(result.map(row=>row.unit.id),["A1"]);
    assert.equal(result[0]!.targetRank,9);
    assert.equal(result[0]!.plan.rankSteps,2);
    assert.deepEqual(result[0]!.plan.blockers,["A1"]);
    assert.equal(result[0]!.plan.rate,90);
    assert.equal(result[0]!.plan.used,1000);
});
test("Silver and Gold have different rank targets and side-specific evidence",()=>{
    const defense=group(),offense=group("B","offense"),units=roster([defense,offense]);
    assert.equal(warUpgradeRecommendations(units,[defense,offense],"silver","defense").length,0);
    const gold=warUpgradeRecommendations(units,[defense,offense],"gold","offense");
    assert.equal(gold.length,5);assert.ok(gold.every(row=>row.unit.id.startsWith("B")&&row.targetRank===12));
    assert.equal(gold[0]!.plan.blockers.length,5);
    units[0]!.rank=15;
    assert.equal(warUpgradeRecommendations(units,[defense],"silver","defense").length,0);
});
test("missing cores, missing flex, duplicate members and unknown ranks never fabricate a viable lineup",()=>{
    const source=group(),units=roster([source],7);
    assert.equal(warUpgradeRecommendations(units.slice(1),[source],"silver","defense").length,0);
    assert.equal(warUpgradeRecommendations(units.slice(0,4),[source],"silver","defense").length,0);
    assert.equal(warUpgradeRecommendations(units,[{...source,core:["A1","A1","A3"]}],"silver","defense").length,0);
    units[0]!.rank=NaN;
    assert.equal(warUpgradeRecommendations(units,[source],"silver","defense").length,0);
});
test("tiny perfect samples cannot displace substantial evidence",()=>{
    assert.ok(warEvidenceConfidence({used:100,rate:95})>warEvidenceConfidence({used:2,rate:100}));
    const source=group();source.flex.push({id:"Tiny",used:2,rate:100});
    const units=roster([source],7);
    const result=warUpgradeRecommendations(units,[source],"silver","defense");
    assert.equal(result.some(row=>row.unit.id==="Tiny"),false);
    assert.equal(warUpgradeRecommendations(units,[{...source,used:2,rate:100}],"silver","defense").length,0);
});
test("a ready equal-or-better flex alternative suppresses unnecessary upgrades, but a stronger cohort remains a project",()=>{
    const source=group();source.flex.push({id:"Project",used:1000,rate:80});
    const units=roster([source]);units.find(unit=>unit.id==="Project")!.rank=7;
    assert.equal(warUpgradeRecommendations(units,[source],"silver","defense").length,0);
    source.flex.find(unit=>unit.id==="Project")!.rate=99;
    const result=warUpgradeRecommendations(units,[source],"silver","defense");
    assert.deepEqual(result.map(row=>row.unit.id),["Project"]);
});
test("a character appears once even when several incomplete lineups can use it",()=>{
    const a=group(),b=group("B");b.core[0]="A1";
    const units=roster([a,b]);units.find(unit=>unit.id==="A1")!.rank=6;
    const result=warUpgradeRecommendations(units,[a,b],"silver","defense");
    assert.equal(result.length,1);assert.equal(result[0]!.alternatives.length,1);
    assert.equal(result[0]!.plan.used,1000,'overlapping samples are not added together');
});
test("exact five-character evidence overrides the same five assembled from a core and flex",()=>{
    const core=group("A","offense"),exact:WarUpgradeSource={...core,key:"exact",kind:"lineup",core:[...core.core,...core.flex.map(unit=>unit.id)],flex:[],rate:75,used:500};
    const units=roster([core]);units[0]!.rank=8;
    const result=warUpgradeRecommendations(units,[core,exact],"silver","offense");
    assert.equal(result.length,1);assert.equal(result[0]!.plan.kind,"lineup");assert.equal(result[0]!.plan.rate,75);assert.equal(result[0]!.plan.used,500);
});
test("rank effort includes every blocking teammate and quick completions can outrank distant projects",()=>{
    const quick=group(),distant={...group("B"),rate:95},units=roster([quick,distant]);
    units.find(unit=>unit.id==="A1")!.rank=8;
    for(const unit of units.filter(unit=>unit.id.startsWith("B")))unit.rank=1;
    const result=warUpgradeRecommendations(units,[quick,distant],"silver","defense");
    assert.equal(result[0]!.unit.id,"A1");
    assert.equal(result.find(row=>row.unit.id==="B1")!.plan.rankSteps,40);
});
test("saved assignments describe reassignments without permitting duplicate characters or inventing measured results",()=>{
    const source=group(),units=roster([source],7),owned=new Set(units.map(unit=>unit.id));
    const snapshot={lineups:{defense:[{core:source.core.map(id=>({id})),flex:source.flex.map(({id})=>({id}))}],offense:[]}};
    const assignments=warUpgradeAssignments(snapshot,"defense",[],owned);
    const plan=warUpgradeRecommendations(units,[source],"silver","defense")[0]!.plan;
    assert.equal(warUpgradeReassignments(plan,assignments),0);
    assert.equal(warUpgradeReassignments(plan,[["A1","X","Y","Z","Q"]]),1);
    assert.deepEqual(warUpgradeAssignments({lineups:{defense:[snapshot.lineups.defense[0],snapshot.lineups.defense[0]]}},"defense",[["fallback"]],owned),[["fallback"]]);
    assert.deepEqual(warUpgradeAssignments({lineups:{defense:[{core:[{id:"unowned"}],flex:[]}]}},"defense",[["fallback"]],owned),[["fallback"]]);
});
