import assert from "node:assert/strict";
import test from "node:test";
import { selectedRaidRoadmap, type RaidUpgradeMember } from "../src/domain/raidRoadmap";
import { nextRoadmapTargets } from "../src/domain/laviscusRoadmap";

const member = (name: string, owned = true): RaidUpgradeMember => ({ name, owned, activeTarget: "35", passiveTarget: "26" });
const core = ["Kariyan", "Laviscus", "Trajann"].map(name => member(name));

test("the next support work follows the selected flex, preserving its own ability guidance", () => {
    const lineup = [...core, member("Gulgortz"), member("Atlacoya")];
    const steps = selectedRaidRoadmap(lineup, false);
    const targets = steps.flatMap(step => step.targets);
    assert.ok(targets.every(target => lineup.some(member => member.name === target.name)));
    assert.equal(targets.some(target => ["Aesoth", "Vitruvius", "Kharn", "Biovore"].includes(target.name)), false);
    assert.deepEqual(steps.find(step => step.number === 2)?.targets.find(target => target.name === "Atlacoya"), { name: "Atlacoya", rank: 12, active: 35, passive: 26 });
    assert.equal(steps.find(step => step.number === 14)?.targets.find(target => target.name === "Atlacoya")?.active, 35);
    const units = core.map(member => ({ name: member.name, rank: 12, rarity: "Legendary", abilities: [{ level: 36 }, { level: 36 }] }));
    assert.deepEqual(nextRoadmapTargets(steps, units)?.targets.map(target => target.name), ["Gulgortz", "Atlacoya"]);
});

test("unselected buffers and unowned units do not block checkpoints", () => {
    const steps = selectedRaidRoadmap([...core, member("Aesoth"), member("Gulgortz", false)], true);
    assert.ok(steps.flatMap(step => step.targets).every(target => target.name !== "Gulgortz" && target.name !== "Vitruvius"));
    assert.ok(steps.flatMap(step => step.targets).some(target => target.name === "Biovore"));
    assert.ok(steps.every(step => step.targets.length > 0));
    assert.deepEqual(steps.find(step => step.number === 5)?.targets, [{ name: "Aesoth", rank: 15, passive: 36 }]);
});

test("other raid lineups get owned rank stages without invented research targets", () => {
    const steps = selectedRaidRoadmap([{ ...member("Helbrecht"), activeTarget: "Research needed", passiveTarget: "35–50" }, member("Ragnar", false)], false);
    assert.deepEqual(steps.map(step => step.targets), [12, 15, 17, 19].map(rank => [{ name: "Helbrecht", rank }]));
    assert.deepEqual(selectedRaidRoadmap([member("Helbrecht", false)], false), []);
    const withMachine = selectedRaidRoadmap([member("Anuphet")], true);
    const machineTargets = withMachine.flatMap(step => step.targets).filter(target => target.name === "Biovore");
    assert.deepEqual(machineTargets, [{ name: "Biovore", active: 30, passive: 30 }, { name: "Biovore", active: 50, passive: 50 }, { name: "Biovore", rarity: "Mythic", active: 60, passive: 60 }]);
    assert.ok(machineTargets.every(target => !("rank" in target)));
});
