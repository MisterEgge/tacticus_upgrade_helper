import assert from "node:assert/strict";
import test from "node:test";
import { dashboardFocus } from "../src/domain/dashboard";

test("dashboard combines multiple equipment needs into one character focus", () =>
{

    const rows = dashboardFocus(
        [{ character: "Kharn", accountPriority: 90 }, { character: "Kharn", accountPriority: 90 }, { character: "Bellator", accountPriority: 80 }],
        [{ character: "Kharn", accountPriority: 90, activeLevel: 12, passiveLevel: 17, activeTo17: true, passiveTo17: false }]
    );
    assert.deepEqual(rows, [
        { character: "Kharn", priority: 90, equipmentSlots: 2, abilitySteps: [{ name: "Active", level: 12 }] },
        { character: "Bellator", priority: 80, equipmentSlots: 1, abilitySteps: [] }
    ]);

});
