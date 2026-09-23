import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

type Plan = { teams?: Array<{ name: string; core: string[] }>; validatedFullLineups?: Array<{ members: string[] }> };

test("War planner data keeps inferred core/flex patterns separate from exact selectable lineups", () =>
{
    for (const path of ["config/war_defense_teams.json", "config/war_offense_teams.json"])
    {
        const plan = JSON.parse(fs.readFileSync(path, "utf8")) as Plan;
        assert.ok(plan.validatedFullLineups?.length);
        assert.equal(plan.validatedFullLineups?.length, 20, `${path} must retain every supplied source row`);
        assert.ok(plan.validatedFullLineups?.every((lineup) => lineup.members.length === 5));
        const eldar = plan.teams?.find((team) => team.name === "Eldar Control");
        assert.ok(eldar);
        assert.ok(!plan.validatedFullLineups?.some((lineup) => eldar.core.every((name) => lineup.members.includes(name))));
    }
});
