import test from "node:test";
import assert from "node:assert/strict";
import { defaultRaidSelection, validateRaidSelection } from "../src/domain/raidSelection";

const teams = { "Avatar of Khaine": { "Big Hit": { core: ["Kariyan", "Laviscus", "Trajann"], flex: ["Aesoth", "Gulgortz", "Kharn"] } }, Magnus: { Custodes: { core: ["Kariyan", "Kharn", "Trajann"], flex: ["Dante", "Aesoth"] } } };

test("saved Raid selection accepts an exact team and unique eligible flex", () =>
{
    assert.deepEqual(validateRaidSelection({ boss: "Magnus", teamName: "Custodes", flex: ["Dante", "Aesoth"] }, teams), { boss: "Magnus", teamName: "Custodes", flex: ["Dante", "Aesoth"] });
    for (const flex of [["Dante", "Dante"], ["Kariyan"], ["Unknown"], ["Dante", "Aesoth", "Gulgortz"]]) assert.equal(validateRaidSelection({ boss: "Magnus", teamName: "Custodes", flex }, teams), null);
    assert.equal(validateRaidSelection({ boss: "Unknown", teamName: "Custodes", flex: [] }, teams), null);
});

test("default Raid lineup uses only owned suggested flex", () =>
{
    assert.deepEqual(defaultRaidSelection(teams, new Set(["Kariyan", "Laviscus", "Trajann", "Aesoth", "Gulgortz"])), { boss: "Avatar of Khaine", teamName: "Big Hit", flex: ["Aesoth", "Gulgortz"] });
});
