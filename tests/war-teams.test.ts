import test from "node:test";
import assert from "node:assert/strict";
import { uniqueWarTeamIndexes } from "../src/domain/warTeams";

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
