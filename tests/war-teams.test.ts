import test from "node:test";
import assert from "node:assert/strict";
import { uniqueWarTeamIndexes, reflowWarTeamIndexes, selectableWarTeamIndexes, restoreWarTeamIndexes } from "../src/domain/warTeams";
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

test("choosing a later War slot keeps the chosen team and all slots distinct",()=>{
    const teams=[
        {used:100,members:[{name:"A"}]},
        {used:90,members:[{name:"B"}]},
        {used:80,members:[{name:"C"}]},
        {used:70,members:[{name:"A"},{name:"B"}]}
    ];
    assert.deepEqual(reflowWarTeamIndexes(teams,2,1,3),[0,2,1]);
    assert.equal(reflowWarTeamIndexes(teams,2,3,3),null);
    assert.deepEqual([...selectableWarTeamIndexes(teams,3)],[0,1,2]);
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
    assert.equal(reflowWarTeamIndexes(teams,0,0,2),null);
    assert.deepEqual(restoreWarTeamIndexes(teams,["Invalid","Other"],2),[1,2]);
});

test("actual sourced defense assignments use each character only once",()=>{
    const source=JSON.parse(readFileSync("config/war_defense_teams.json","utf8")) as {validatedFullLineups:Array<{used:number;members:string[]}>};
    const teams=source.validatedFullLineups.map(team=>({used:team.used,members:team.members.map(name=>({name}))}));
    const selected=uniqueWarTeamIndexes(teams,5).flatMap(index=>teams[index]!.members.map(member=>member.name));
    assert.equal(selected.length,25);
    assert.equal(new Set(selected).size,25);
});
