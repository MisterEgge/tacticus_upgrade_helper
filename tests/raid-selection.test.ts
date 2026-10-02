import test from "node:test";
import assert from "node:assert/strict";
import { defaultRaidSelection, resolveRaidSelection, validateRaidSelection } from "../src/domain/raidSelection";

const teams = { "Avatar of Khaine": { "Big Hit": { core: ["Kariyan", "Laviscus", "Trajann"], flex: ["Aesoth", "Gulgortz", "Kharn"] } }, Magnus: { Custodes: { core: ["Kariyan", "Kharn", "Trajann"], flex: ["Dante", "Aesoth"] } } };

test("saved Raid selection accepts an exact team and unique eligible flex", () =>
{
    assert.deepEqual(validateRaidSelection({ boss: "Magnus", teamName: "Custodes", flex: ["Dante", "Aesoth"] }, teams), { boss: "Magnus", teamName: "Custodes", flex: ["Dante", "Aesoth"] });
    for (const flex of [["Dante", "Dante"], ["Kariyan"], ["Unknown"], ["Dante", "Aesoth", "Gulgortz"]]) assert.equal(validateRaidSelection({ boss: "Magnus", teamName: "Custodes", flex }, teams), null);
    assert.equal(validateRaidSelection({ boss: "Unknown", teamName: "Custodes", flex: [] }, teams), null);
});

test("default Raid lineup uses only owned suggested flex", () =>
{
    assert.deepEqual(defaultRaidSelection(teams, new Set(["Kariyan", "Laviscus", "Trajann", "Aesoth", "Gulgortz"])), { boss: "Avatar of Khaine", teamName: "Big Hit", flex: ["Aesoth", "Gulgortz"], autoFlex: true });
});

test("automatic saves refresh after an unlock, legacy saves migrate, and manual overrides persist", () => {
    const stored = { boss: "Avatar of Khaine", teamName: "Big Hit", flex: ["Kharn"] };
    assert.deepEqual(resolveRaidSelection(stored, teams, new Set(["Aesoth", "Gulgortz"])).flex, ["Aesoth", "Gulgortz"]);
    assert.deepEqual(resolveRaidSelection({ ...stored, autoFlex: true }, teams, new Set(["Aesoth"])).flex, ["Aesoth"]);
    assert.deepEqual(resolveRaidSelection({ ...stored, autoFlex: false }, teams, new Set(["Aesoth", "Gulgortz", "Kharn"])), { ...stored, autoFlex: false });
    assert.equal(validateRaidSelection({ ...stored, autoFlex: "true" }, teams), null);
    assert.deepEqual(resolveRaidSelection({ boss: "Magnus", teamName: "Custodes", flex: ["Obsolete source name"] }, teams, new Set(["Dante"])),
        { boss: "Magnus", teamName: "Custodes", flex: ["Dante"], autoFlex: true });
});
