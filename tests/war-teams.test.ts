import test from "node:test";
import assert from "node:assert/strict";
import { uniqueWarTeamIndexes, restoreWarTeamIndexes, warSlotChoices, chooseWarTeamForSlot, distinctWarSlots, buildDistinctDefenseTeams, type DefenseCore } from "../src/domain/warTeams";
import {readFileSync} from "node:fs";

test("War defaults choose five distinct teams instead of the five first options", () =>
{
    const teams = [
        { used: 100, members: [{ name: "A" }, { name: "B" }] },
        { used: 90, members: [{ name: "A" }, { name: "C" }] },
        { used: 80, members: [{ name: "D" }, { name: "E" }] },
        { used: 70, members: [{ name: "F" }, { name: "G" }] },
        { used: 60, members: [{ name: "H" }, { name: "I" }] },
        { used: 50, members: [{ name: "J" }, { name: "K" }] }
    ];
    assert.deepEqual(uniqueWarTeamIndexes(teams, 5), [0, 2, 3, 4, 5]);
});

test("saved War teams restore by name and reject missing or duplicate characters",()=>{
    const teams=[
        {name:"A",used:100,members:[{name:"one"}]},
        {name:"B",used:90,members:[{name:"two"}]},
        {name:"C",used:80,members:[{name:"one"}]}
    ];
    assert.deepEqual(restoreWarTeamIndexes(teams,["B","A"],2),[1,0]);
    assert.deepEqual(restoreWarTeamIndexes(teams,["C","A"],2),[0,1]);
    assert.deepEqual(restoreWarTeamIndexes(teams,["missing","B"],2),[0,1]);
    assert.deepEqual(restoreWarTeamIndexes(teams,"broken",2),[0,1]);
});

test("a source lineup repeating a character cannot enter any assigned slot",()=>{
    const teams=[{name:"Invalid",used:100,members:[{name:"Typhus"},{name:"Typhus"}]},{name:"Valid",used:50,members:[{name:"Typhus"}]},{name:"Other",used:40,members:[{name:"Maladus"}]}];
    assert.deepEqual(uniqueWarTeamIndexes(teams,2),[1,2]);
    assert.equal(chooseWarTeamForSlot(teams,[1,2],0,0),null);
    assert.deepEqual(restoreWarTeamIndexes(teams,["Invalid","Other"],2),[1,2]);
});

test("actual sourced defense assignments use each character only once",()=>{
    const source=JSON.parse(readFileSync("config/war_defense_teams.json","utf8")) as {validatedFullLineups:Array<{used:number;members:string[]}>};
    const teams=source.validatedFullLineups.map(team=>({used:team.used,members:team.members.map(name=>({name}))}));
    const selected=uniqueWarTeamIndexes(teams,5).flatMap(index=>teams[index]!.members.map(member=>member.name));
    assert.equal(selected.length,25);
    assert.equal(new Set(selected).size,25);
});

test("owned defense cores yield ten separate five-character teams with no reused core or flex",()=>{
    const source=JSON.parse(readFileSync("config/war_defense_teams.json","utf8")) as {teams:DefenseCore[]};
    const report=JSON.parse(readFileSync("output/upgrade-report.json","utf8")) as {roster:Array<{name:string}>};
    const teams=buildDistinctDefenseTeams(source.teams,new Set(report.roster.map(unit=>unit.name)));
    const names=teams.flatMap(team=>team.members);
    assert.equal(teams.length,10);
    assert.equal(names.length,50);
    assert.equal(new Set(names).size,50);
    assert.ok(teams.every(team=>team.evidence==="core-flex"));
    assert.ok(teams.every(team=>source.teams.some(core=>core.core.every(name=>team.members.includes(name)))));
    const candidates=teams.map(team=>({...team,members:team.members.map(name=>({name}))}));
    const slots=candidates.map((_,index)=>index);
    assert.equal(warSlotChoices(candidates,slots,0).assigned.length,10);
    const swapped=chooseWarTeamForSlot(candidates,slots,0,9)!;
    assert.equal(swapped[0],9);
    assert.equal(swapped[9],0);
    assert.equal(distinctWarSlots(candidates,swapped),true);
});

test("defense skips incomplete cores and flex pools without consuming any members",()=>{
    const cores:DefenseCore[]=[
        {name:"missing",core:["A","B","unowned"],flex:[{name:"D",used:30},{name:"E",used:20}],used:100,wins:90,score:1},
        {name:"short",core:["A","B","C"],flex:[{name:"D",used:30}],used:100,wins:80,score:1},
        {name:"full",core:["A","B","C"],flex:[{name:"D",used:30},{name:"E",used:20}],used:100,wins:70,score:1}
    ];
    assert.deepEqual(buildDistinctDefenseTeams(cores,new Set(["A","B","C","D","E"])).map(team=>team.members),[["A","B","C","D","E"]]);
});

test("swapping a defense team into a Gold slot keeps all five assignments and their unique members",()=>{
    const teams=["A","B","C","D","E"].map((name,index)=>({used:100-index,members:[{name}]}));
    const selected=[0,1,2,3,4];
    assert.deepEqual(chooseWarTeamForSlot(teams,selected,0,3),[3,1,2,0,4]);
    assert.equal(distinctWarSlots(teams,[3,1,2,0,4]),true);
    assert.equal(selected[0],0);
});

test("slot alternatives exclude another assigned team's Typhus and preserve other slots",()=>{
    const teams=[
        {used:100,members:[{name:"Typhus"},{name:"Maladus"}]},
        {used:90,members:[{name:"Bellator"}]},
        {used:80,members:[{name:"Typhus"},{name:"Corrodius"}]},
        {used:70,members:[{name:"Isabella"}]}
    ];
    const slots=[0,1];
    assert.deepEqual(warSlotChoices(teams,slots,1).alternatives,[3]);
    assert.deepEqual(warSlotChoices(teams,slots,0).alternatives,[2,3]);
    assert.equal(chooseWarTeamForSlot(teams,slots,1,2),null);
    assert.deepEqual(chooseWarTeamForSlot(teams,slots,1,3),[0,3]);
    assert.deepEqual(chooseWarTeamForSlot(teams,slots,1,0),[1,0]);
});
