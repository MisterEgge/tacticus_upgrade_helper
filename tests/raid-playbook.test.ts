import assert from "node:assert/strict";
import test from "node:test";
import { raidPlaybook } from "../src/domain/raidPlaybook";
import meta from "../config/raid_boss_meta.json";
import { raidCandidates, suggestedRaidLineup } from "../src/domain/raidLineup";

const lineup = ["Kariyan", "Laviscus", "Trajann", "Gulgortz", "Aesoth"];
test("default rotation puts Kariyan first on 3/6 and uses cooldown-safe Aesoth 2/5", () => {
    const plan = raidPlaybook("Screamer-Killer", "Lavistodes", lineup, "Plagueburst Crawler");
    assert.equal(plan.available, true);
    assert.deepEqual(plan.turns.filter(turn => turn.actions.some(action => action.kind === "active" && action.character === "Kariyan")).map(turn => turn.turn), [3, 6]);
    assert.deepEqual(plan.turns.filter(turn => turn.actions.some(action => action.kind === "active" && action.character === "Aesoth")).map(turn => turn.turn), [2, 5]);
    for (const turn of plan.turns) {
        assert.equal(turn.actions.at(-1)?.character, "Laviscus");
        assert.equal(turn.actions.at(-1)?.kind, "attack");
        assert.equal(turn.actions.filter(action => action.character === "Kariyan").length, 1);
        assert.ok(turn.actions.every(action => lineup.includes(action.character)));
    }
    assert.equal(plan.turns[5]?.actions[0]?.character, "Kariyan");
    assert.equal(plan.turns[5]?.actions[1]?.character, "Gulgortz");
    assert.equal(plan.turns[5]?.actions.some(action => action.character === "Gulgortz" && action.kind === "attack"), false);
    assert.match(plan.turns[3]!.actions[0]!.text, /heal/);
    assert.match(plan.turns[0]!.note, /positioning/);
});

test("early rotation moves both repeatable cooldowns without adding a third use", () => {
    const plan = raidPlaybook("Mortarion", "Big Hit", lineup, "Biovore", 2);
    for (const [character, expected] of [["Kariyan", [2, 5]], ["Aesoth", [3, 6]]] as const) {
        assert.deepEqual(plan.turns.filter(turn => turn.actions.some(action => action.character === character && action.kind === "active")).map(turn => turn.turn), [...expected]);
    }
    assert.match(plan.bossGuide!.rule, /summons take double/);
});

test("Ghazghkull spends scarce attacks on Kariyan and Laviscus before other damage", () => {
    const ghaz = ["Kariyan", "Laviscus", "Trajann", "Vitruvius", "Aesoth"];
    const plan = raidPlaybook("Ghazghkull", "Big Hit", ghaz, "Biovore");
    assert.match(plan.bossGuide!.rule, /attacks, not individual hits/);
    assert.deepEqual(plan.turns[2]!.actions.slice(0, 2).map(action => action.character), ["Kariyan", "Laviscus"]);
    assert.deepEqual(plan.turns[1]!.actions.slice(0, 3).map(action => action.character), ["Aesoth", "Kariyan", "Laviscus"]);
    assert.match(plan.turns[5]!.actions.find(action => action.character === "Laviscus" && action.kind === "active")!.condition, /BOTH/);
    assert.equal(plan.replayMatches, true);
    assert.equal(raidPlaybook("Ghazghkull", "Big Hit", ghaz, "Galatian").replayMatches, false);
});

test("missing buffers and core substitutions never inherit absent abilities", () => {
    const withoutAesoth = lineup.map(name => name === "Aesoth" ? "Anuphet" : name);
    const plan = raidPlaybook("Szarekh", "Big Hit", withoutAesoth, "Biovore");
    assert.ok(plan.warnings.some(warning => /Aesoth is absent/.test(warning)));
    assert.equal(plan.positions.some(position => position.character === "Aesoth"), false);
    assert.equal(plan.turns.some(turn => turn.actions.some(action => action.character === "Aesoth")), false);
    assert.equal(plan.turns.some(turn => turn.actions.some(action => action.character === "Anuphet" && action.kind === "active")), false);
    assert.match(plan.turns[4]!.note, /not guaranteed/);
    for (const names of [lineup.slice(0, 4), [...lineup.slice(0, 4), "Kariyan"], lineup.map(name => name === "Trajann" ? "Anuphet" : name)]) {
        assert.equal(raidPlaybook("Szarekh", "Big Hit", names, "Biovore").available, false);
        assert.deepEqual(raidPlaybook("Szarekh", "Big Hit", names, "Biovore").turns, []);
    }
    assert.equal(raidPlaybook("Riptide", "Ad-Mech", ["Actus", "Exitor-Rho", "Tan Gi'da", "Gulgortz", "Anuphet"], "Reanimator").available, false);
    const noLav = raidPlaybook("Magnus", "Custodes", ["Kariyan", "Trajann", "Kharn", "Ragnar", "Helbrecht"], "Biovore");
    assert.equal(noLav.available, true);
    assert.equal(noLav.turns.some(turn => turn.actions.some(action => action.character === "Laviscus")), false);
    assert.equal(noLav.replayMatches, true);
    const noLavWithBoss = raidPlaybook("Magnus", "Custodes", ["Kariyan", "Trajann", "Kharn", "Dante", "Gulgortz"], "Biovore");
    assert.doesNotMatch(JSON.stringify([noLavWithBoss.positions, noLavWithBoss.turns]), /Laviscus/);
    assert.equal(raidPlaybook("Unknown future boss", "Big Hit", lineup, "Biovore").available, false);
});

test("all configured supported raid archetypes have boss constraints and only selected actors", () => {
    for (const [boss, teams] of Object.entries(meta.bosses)) for (const [teamName, team] of Object.entries(teams)) {
        if (!["Big Hit", "Lavistodes", "Custodes"].includes(teamName)) continue;
        const names = suggestedRaidLineup({ ...team, members: raidCandidates(team).map(name => ({ name, owned: true })) });
        const plan = raidPlaybook(boss, teamName, names, null);
        assert.ok(plan.bossGuide, boss);
        assert.equal(plan.available, true, `${boss} ${teamName}`);
        assert.ok(plan.turns.every(turn => turn.actions.every(action => names.includes(action.character))));
    }
});
