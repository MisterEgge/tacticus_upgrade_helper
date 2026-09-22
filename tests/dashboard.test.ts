import assert from "node:assert/strict";
import test from "node:test";
import { dashboardFocus } from "../src/domain/dashboard";

test("dashboard combines multiple equipment needs into one character focus", () =>
{

    const rows = dashboardFocus(
        [{ character: "Kharn" }, { character: "Kharn" }, { character: "Bellator" }],
        [{ character: "Kharn", activeLevel: 12, passiveLevel: 17, activeTo17: true, passiveTo17: false }]
    );
    assert.deepEqual(rows, [
        { character: "Kharn", equipmentSlots: 2, abilitySteps: [{ name: "Active", level: 12 }] },
        { character: "Bellator", equipmentSlots: 1, abilitySteps: [] }
    ]);

});
