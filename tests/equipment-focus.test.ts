import assert from "node:assert/strict";
import test from "node:test";
import {equipmentFocusLabels,equipmentFocusPriority}from "../src/domain/equipmentFocus";

test("equipment focus keeps active War and Raid labels separate from incomplete campaign work",()=>
{
    const focus={Trajann:{priority:94,modes:["Guild Raid","Guild War"]},Bellator:{priority:70,modes:["Campaign"]}};
    assert.deepEqual(equipmentFocusLabels("Trajann",focus,new Set(["Bellator"])),["Guild Raid","Guild War"]);
    assert.deepEqual(equipmentFocusLabels("Bellator",focus,new Set(["Bellator"])),["Incomplete Campaign"]);
    assert.equal(equipmentFocusPriority("Unknown",focus,new Set()),0);
});
