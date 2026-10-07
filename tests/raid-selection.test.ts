import test from "node:test";
import assert from "node:assert/strict";
import { defaultRaidSelection, resolveRaidSelection, selectedRaidNames, validateRaidSelection, type RaidTeams } from "../src/domain/raidSelection";

const teams: RaidTeams = { "Avatar of Khaine": { "Big Hit": { core: ["Kariyan", "Laviscus", "Trajann"], flex: ["Aesoth", "Gulgortz", "Kharn"], fallbacks: ["Bellator"] } }, Magnus: { Custodes: { core: ["Kariyan", "Kharn", "Trajann"], flex: ["Dante", "Aesoth"] } } };
const core = ["Kariyan", "Laviscus", "Trajann"];

test("saved Raid selection validates unique character slots, substitutes and separate machine", () => {
    assert.deepEqual(validateRaidSelection({ boss: "Magnus", teamName: "Custodes", flex: ["Dante", "Aesoth"] }, teams), { boss: "Magnus", teamName: "Custodes", flex: ["Dante", "Aesoth"] });
    for (const flex of [["Dante", "Dante"], ["Kariyan"], ["Unknown"], ["Dante", "Aesoth", "Gulgortz"]]) assert.equal(validateRaidSelection({ boss: "Magnus", teamName: "Custodes", flex }, teams), null);
    const choice = { boss: "Avatar of Khaine", teamName: "Big Hit", lineup: ["Kariyan", "Trajann", "Gulgortz", "Kharn", "Bellator"], flex: ["Gulgortz", "Kharn", "Bellator"], machine: "Biovore" };
    assert.deepEqual(validateRaidSelection(choice, teams), choice);
    assert.equal(validateRaidSelection({ ...choice, lineup: [...choice.lineup, "Aesoth"] }, teams), null);
    assert.equal(validateRaidSelection({ ...choice, lineup: ["Kariyan", "Trajann", "Gulgortz", "Kharn", "Biovore"] }, teams), null);
    assert.equal(validateRaidSelection({ ...choice, flex: ["Gulgortz", "Kharn"] }, teams), null);
    assert.equal(validateRaidSelection({ ...choice, machine: "Unknown" }, teams), null);
    assert.equal(validateRaidSelection({ ...choice, autoMachine: "true" }, teams), null);
});

test("default Raid lineup is owned, full, and distinguishes a missing machine", () => {
    const selection = defaultRaidSelection(teams, new Set([...core, "Aesoth", "Gulgortz"]));
    assert.deepEqual(selectedRaidNames(selection, teams[selection.boss]![selection.teamName]!), [...core, "Aesoth", "Gulgortz"]);
    assert.deepEqual(selection.flex, ["Aesoth", "Gulgortz"]);
    assert.equal(selection.autoFlex, true);
    assert.equal(selection.machine, null);
});

test("automatic saves refresh after unlocks; manual substitutions and machine overrides persist", () => {
    const stored = { boss: "Avatar of Khaine", teamName: "Big Hit", flex: ["Kharn"] };
    const owned = new Set([...core, "Aesoth", "Gulgortz", "Kharn", "Bellator", "Biovore", "Galatian"]);
    assert.deepEqual(resolveRaidSelection(stored, teams, owned).flex, ["Aesoth", "Gulgortz"]);
    const manual = { ...stored, autoFlex: false, lineup: ["Kariyan", "Laviscus", "Trajann", "Kharn", "Bellator"], flex: ["Kharn", "Bellator"], machine: "Galatian", autoMachine: false };
    assert.deepEqual(resolveRaidSelection(manual, teams, owned), manual);
    owned.delete("Laviscus");
    const replaced = resolveRaidSelection(manual, teams, owned);
    assert.equal(replaced.lineup!.length, 5);
    assert.equal(replaced.lineup!.includes("Laviscus"), false);
    assert.ok(replaced.lineup!.includes("Bellator"));
    assert.equal(validateRaidSelection({ ...stored, autoFlex: "true" }, teams), null);
    const migrated = resolveRaidSelection({ boss: "Magnus", teamName: "Custodes", flex: ["Obsolete source name"] }, teams, new Set(["Dante"]));
    assert.equal(migrated.boss, "Magnus");
    assert.deepEqual(migrated.lineup, ["Dante"]);
});
