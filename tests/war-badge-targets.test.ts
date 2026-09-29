import test from "node:test";
import assert from "node:assert/strict";
import { warBadgeTargets } from "../src/domain/warBadgeTargets";

const defense=[
    {name:"Gold",used:100,members:[{name:"Trajann"},{name:"Kariyan"}]},
    {name:"Silver",used:80,members:[{name:"Bellator"}]},
    {name:"D3",used:70,members:[{name:"Isabella"}]},
    {name:"D4",used:60,members:[{name:"Calgar"}]},
    {name:"D5",used:50,members:[{name:"Lucien"}]}
];
const offense=[
    {name:"Attack",used:120,members:[{name:"Trajann"},{name:"Kharn"}]},
    {name:"Second",used:60,members:[{name:"Eldryon"}]}
];

test("selected War slots set ability targets and deduplicate characters across modes",()=>{
    const saved={defense:["Silver","D3","Gold","D4","D5"],offense:["Attack","Second"],offenseTiers:["silver","gold",...Array(8).fill("silver")]};
    const targets=warBadgeTargets(defense,offense,saved,"war-both");
    assert.deepEqual([...targets.entries()].sort(),[["Bellator",35],["Isabella",35],["Kariyan",26],["Calgar",26],["Lucien",26],["Eldryon",35],["Kharn",26],["Trajann",26]].sort());
    assert.equal(warBadgeTargets(defense,offense,saved,"war-defense").has("Kharn"),false);
});

test("stale War selections fall back to current buildable options",()=>{
    const targets=warBadgeTargets(defense,offense,{defense:["removed","Gold"]},"war-defense");
    assert.equal(targets.get("Trajann"),35);
    assert.equal(targets.get("Bellator"),35);
});
