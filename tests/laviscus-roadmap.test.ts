import test from "node:test";
import assert from "node:assert/strict";
import { firstPendingCheckpoint, laviscusBuffer, laviscusRoadmap, roadmapTargetMet } from "../src/domain/laviscusRoadmap";

test("roadmap has all 14 ordered milestones and uses the first owned buffer", () =>
{
    assert.equal(laviscusBuffer(new Set(["Aesoth", "Dante"])), "Aesoth");
    assert.equal(laviscusBuffer(new Set(["Vitruvius", "Aesoth"])), "Vitruvius");
    const steps = laviscusRoadmap("Aesoth");
    assert.deepEqual(steps.map(step => step.number), Array.from({ length: 14 }, (_, index) => index + 1));
    assert.deepEqual(steps[1]?.targets, [{ name: "Aesoth", rank: 12, passive: 36 }]);
    assert.deepEqual(steps[2]?.targets, [{ name: "Biovore", active: 30, passive: 30 }]);
    assert.deepEqual(steps[12]?.targets, [{ name: "Biovore", rarity: "Mythic", active: 60, passive: 60 }]);
    assert.ok(steps[5]?.targets.some(target => target.name === "Kharn"));
});

test("checkpoint stays pending until rank and each specified ability are met", () =>
{
    const unit = { name: "Kariyan", rank: 14, rarity: "Legendary", abilities: [{ level: 41 }, { level: 41 }] };
    assert.ok(roadmapTargetMet({ name: "Kariyan", rank: 12, active: 36, passive: 36 }, unit));
    assert.equal(roadmapTargetMet({ name: "Kariyan", rank: 15, active: 44, passive: 44 }, unit), false);
    assert.equal(firstPendingCheckpoint(laviscusRoadmap("Aesoth"), [unit]), 1);
    assert.equal(roadmapTargetMet({ name: "Biovore", rarity: "Mythic", active: 60, passive: 60 }, { name: "Biovore", rank: 0, rarity: "Epic", abilities: [{ level: 60 }, { level: 60 }] }), false);
});
