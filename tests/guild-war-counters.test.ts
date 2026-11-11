import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
    findGuildWarDefenseCohorts,
    findGuildWarTeamMatchups,
    validateGuildWarCounterKnowledge,
    type GuildWarCounterKnowledge
} from "../src/domain/guildWarCounters";

const characters = [
    ...["d1", "d2", "d3", "d4", "d5", "o1", "o2", "o3", "o4", "o5"].map(id => ({ id, name: id, faction: "Test", icon: "" }))
];
const source = { test: { title: "Test source", url: "https://example.com" } };
const knowledge: GuildWarCounterKnowledge = {
    _meta: { reviewedOn: "2026-10-29", note: "Test data" },
    sources: source,
    unitCounters: [{ defenderId: "d1", counters: [{ unitId: "o1", rationale: "Test rationale", confidence: "medium", sourceIds: ["test"] }] }],
    mechanicNotes: [],
    mechanicRules: [],
    teamMatchups: [{ defenseIds: ["d1", "d2", "d3", "d4", "d5"], defenseTier: "gold", offenseIds: ["o1", "o2", "o3", "o4", "o5"], rationale: "Test matchup", confidence: "high", sourceIds: ["test"] }],
    defenseCohorts: []
};

test("exact Guild War team matchups ignore deployment order but enforce full team and tier", () =>
{

    assert.equal(findGuildWarTeamMatchups(["d5", "d4", "d3", "d2", "d1"], "gold", knowledge.teamMatchups).length, 1);
    assert.equal(findGuildWarTeamMatchups(["d1", "d2", "d3", "d4", "d5"], "silver", knowledge.teamMatchups).length, 0);
    assert.equal(findGuildWarTeamMatchups(["d1", "d2", "d3", "d4"], "gold", knowledge.teamMatchups).length, 0);
    assert.equal(findGuildWarTeamMatchups(["d1", "d2", "d3", "d4", "d4"], "gold", knowledge.teamMatchups).length, 0);

});

test("defense-cohort search matches by documented overlap threshold, not as an exact lineup", () =>
{

    const cohorts = [{
        name: "Test defense",
        defenseIds: ["d1", "d2", "d3", "d4", "d5"],
        minimumSharedDefenders: 3,
        defenseAttempts: 100,
        defenseFailures: 40,
        mostCommonBattlefield: "BF5",
        mostCommonBattlefieldShare: 55,
        mostCommonMachine: "Test machine",
        attackCores: [{ name: "Test attack core", unitIds: ["o1", "o2", "o3"], wins: 9, attempts: 10, supported: false }],
        sourceIds: ["test"]
    }];
    const result = findGuildWarDefenseCohorts(["d1", "d2", "d3", "o4", "o5"], cohorts);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.sharedCount, 3);
    assert.equal(findGuildWarDefenseCohorts(["d1", "d2", "o3", "o4", "o5"], cohorts).length, 0);

});

test("mechanic counter options match defender traits and exclude incompatible interactions", async () =>
{

    const { findGuildWarMechanicCounterOptions } = await import("../src/domain/guildWarCounters");
    const roster = [
        { id: "armored", name: "Armored", faction: "Test", icon: "", traits: ["TerminatorArmour"] },
        { id: "infiltrator", name: "Infiltrator", faction: "Test", icon: "", traits: ["Infiltrate"] },
        { id: "suppressor", name: "Suppressor", faction: "Test", icon: "", traits: ["SuppressiveFire"] }
    ];
    const rules = [{
        id: "overwatch",
        title: "Avoid Overwatch",
        defenderTraits: ["Overwatch"],
        rationale: "Mechanic test",
        sourceIds: ["test"],
        candidateGroups: [
            { label: "Infiltrate", rationale: "Avoids Overwatch", candidateTrait: "Infiltrate", sourceIds: ["test"] },
            { label: "Suppression", rationale: "Stops Overwatch", candidateTrait: "SuppressiveFire", excludedDefenderTraits: ["TerminatorArmour"], sourceIds: ["test"] }
        ]
    }];
    const defender = { id: "watcher", name: "Watcher", faction: "Test", icon: "", traits: ["Overwatch"] };
    const matches = findGuildWarMechanicCounterOptions(defender, [...roster, defender], rules);
    assert.deepEqual(matches[0]!.candidateGroups.map(group => group.characters.map(character => character.id)), [["infiltrator"], ["suppressor"]]);
    const armoredWatcher = { ...defender, traits: ["Overwatch", "TerminatorArmour"] };
    const armoredMatches = findGuildWarMechanicCounterOptions(armoredWatcher, [...roster, armoredWatcher], rules);
    assert.deepEqual(armoredMatches[0]!.candidateGroups.map(group => group.group.label), ["Infiltrate"]);

});

test("counter knowledge rejects unsupported or invalid character references", () =>
{

    assert.doesNotThrow(() => validateGuildWarCounterKnowledge(characters, knowledge));
    assert.throws(() => validateGuildWarCounterKnowledge(characters, {
        ...knowledge,
        unitCounters: [{ defenderId: "missing", counters: [] }]
    }), /Unknown Guild War defender/);
    assert.throws(() => validateGuildWarCounterKnowledge(characters, {
        ...knowledge,
        teamMatchups: [{ ...knowledge.teamMatchups[0]!, sourceIds: [] }]
    }), /must cite at least one known source/);
    assert.throws(() => validateGuildWarCounterKnowledge(characters, {
        ...knowledge,
        mechanicNotes: [{ defenderId: "missing", note: "Unsupported note", confidence: "low", sourceId: "test" }]
    }), /Unknown Guild War mechanic-note defender/);
    assert.throws(() => validateGuildWarCounterKnowledge(characters, {
        ...knowledge,
        sources: { test: { title: "Test", url: "javascript:alert(1)" } }
    }), /must have a title and use HTTPS/);

});

test("checked-in counter knowledge references valid roster characters and sources", () =>
{

    const catalog = JSON.parse(readFileSync("data/character_catalog.json", "utf8")) as { characters: Array<{ id: string; name: string; faction: string; icon: string; traits: string[] }> };
    const data = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    assert.doesNotThrow(() => validateGuildWarCounterKnowledge(catalog.characters, data));

});

test("Terminator Armour gets only sourced damage-type bypass options", async () =>
{

    const catalog = JSON.parse(readFileSync("data/character_catalog.json", "utf8")) as { characters: Array<{ id: string; name: string; faction: string; icon: string; traits: string[] }> };
    const data = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    const { findGuildWarMechanicCounterOptions } = await import("../src/domain/guildWarCounters");
    const defender = catalog.characters.find(character => character.id === "blackTerminator")!;
    const result = findGuildWarMechanicCounterOptions(defender, catalog.characters, data.mechanicRules);
    assert.equal(result[0]!.rule.id, "terminator-armour-damage-types");
    assert.ok(result[0]!.candidateGroups.some(group => group.characters.some(character => character.id === "ultraTigurius")));
    assert.ok(result[0]!.candidateGroups.some(group => group.characters.some(character => character.id === "tyranDeathleaper")));
    assert.ok(result[0]!.candidateGroups.some(group => group.characters.some(character => character.id === "admecDestroyer")));
    assert.ok(result[0]!.candidateGroups.some(group => group.characters.some(character => character.id === "votanIronmaster")));
    assert.ok(!result[0]!.candidateGroups.some(group => group.characters.some(character => character.id === "ultraEliminatorSgt")));

});

test("Rotbone's revive mechanic points to Maladus's Always-Overkill active", async () =>
{

    const catalog = JSON.parse(readFileSync("data/character_catalog.json", "utf8")) as { characters: Array<{ id: string; name: string; faction: string; icon: string; traits: string[] }> };
    const data = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    const { findGuildWarMechanicCounterOptions } = await import("../src/domain/guildWarCounters");
    const rotbone = catalog.characters.find(character => character.id === "deathRotbone")!;
    const result = findGuildWarMechanicCounterOptions(rotbone, catalog.characters, data.mechanicRules);
    const reviveRule = result.find(match => match.rule.id === "rotbone-revive");
    assert.ok(reviveRule);
    assert.deepEqual(reviveRule.candidateGroups[0]!.characters.map(character => character.id), ["deathBlightlord"]);
    const otherResilient = catalog.characters.find(character => character.id === "deathBlightlord")!;
    assert.ok(!findGuildWarMechanicCounterOptions(otherResilient, catalog.characters, data.mechanicRules).some(match => match.rule.id === "rotbone-revive"));

});

test("Flying and Big Target defenders match only their sourced control abilities", async () =>
{

    const catalog = JSON.parse(readFileSync("data/character_catalog.json", "utf8")) as { characters: Array<{ id: string; name: string; faction: string; icon: string; traits: string[] }> };
    const data = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    const { findGuildWarMechanicCounterOptions } = await import("../src/domain/guildWarCounters");
    const flyingDefender = catalog.characters.find(character => character.traits.includes("Flying"))!;
    const flyingOptions = findGuildWarMechanicCounterOptions(flyingDefender, catalog.characters, data.mechanicRules);
    assert.ok(flyingOptions.find(match => match.rule.id === "flying-stun")?.candidateGroups[0]?.characters.some(character => character.id === "spaceStormcaller"));
    const bigTarget = catalog.characters.find(character => character.traits.includes("BigTarget"))!;
    const bigTargetOptions = findGuildWarMechanicCounterOptions(bigTarget, catalog.characters, data.mechanicRules);
    assert.ok(bigTargetOptions.find(match => match.rule.id === "big-target-stun")?.candidateGroups[0]?.characters.some(character => character.id === "orksNob"));

});

test("the expanded trait rules cover armor, Psykers, Vehicles, explosive deaths, and tactical traits", async () =>
{

    const catalog = JSON.parse(readFileSync("data/character_catalog.json", "utf8")) as { characters: Array<{ id: string; name: string; faction: string; icon: string; traits: string[] }> };
    const data = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    const { findGuildWarMechanicCounterOptions } = await import("../src/domain/guildWarCounters");
    const getRuleIds = (characterId: string) =>
    {

        const character = catalog.characters.find(entry => entry.id === characterId)!;
        return findGuildWarMechanicCounterOptions(character, catalog.characters, data.mechanicRules).map(match => match.rule.id);

    };
    assert.ok(getRuleIds("ultraCalgar").includes("gravis-armour"));
    assert.ok(getRuleIds("thousAhriman").includes("psyker-specialists"));
    assert.ok(getRuleIds("admecDestroyer").includes("vehicle-damage"));
    assert.ok(getRuleIds("ultraTitus").includes("final-vengeance-overkill"));
    assert.ok(getRuleIds("adeptMorvenn").includes("explodes-spacing"));
    assert.ok(getRuleIds("astarCyrus").includes("camouflage-counterplay"));
    assert.ok(getRuleIds("custoAtlacoya").includes("parry-counterplay"));
    assert.ok(getRuleIds("necroPlasmancer").includes("living-metal-regeneration"));
    assert.ok(getRuleIds("adeptHospitaller").includes("healer-focus"));
    assert.ok(getRuleIds("genesPrimus").includes("ambush-decoys"));
    assert.ok(getRuleIds("worldKharn").includes("khorne-melee-stacks"));
    assert.ok(getRuleIds("emperKakophonist").includes("thrill-seeker-crits"));
    assert.ok(getRuleIds("orksRuntherd").includes("get-stuck-in-positioning"));
    assert.ok(getRuleIds("votanIronmaster").includes("mechanic-repair"));
    assert.ok(getRuleIds("darkaAsmodai").includes("terrifying-ranged"));
    assert.ok(getRuleIds("adeptRetributor").includes("act-of-faith-crit"));
    assert.ok(getRuleIds("blackObliterator").includes("heavy-weapon-counterplay"));
    assert.ok(getRuleIds("worldExecutions").includes("khorne-melee-stacks"), JSON.stringify(getRuleIds("worldExecutions")));
    assert.ok(getRuleIds("astraCreed").includes("castellan-creed-support"));
    assert.ok(getRuleIds("tauAunShi").includes("aunshi-support"));
    assert.equal(catalog.characters.filter(character => findGuildWarMechanicCounterOptions(character, catalog.characters, data.mechanicRules).length > 0).length, catalog.characters.length);

});

test("the provided Death Guard defense retrieves only three-shared-character cohort evidence", () =>
{

    const data = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    const results = findGuildWarDefenseCohorts(["blackTerminator", "deathBlightlord", "worldKharn", "deathRotbone", "deathTyphus"], data.defenseCohorts);
    assert.equal(results.length, 1);
    assert.equal(results[0]!.cohort.name, "Death Guard");
    assert.equal(results[0]!.sharedCount, 3);
    assert.deepEqual(results[0]!.sharedDefenders.sort(), ["deathBlightlord", "deathRotbone", "deathTyphus"].sort());
    assert.ok(results[0]!.cohort.attackCores.some(core => core.unitIds.length === 5 && core.wins === 502 && core.attempts === 583));

});
