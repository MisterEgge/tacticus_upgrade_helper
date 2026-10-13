import assert from "node:assert/strict";
import test from "node:test";
import { raidCandidates, suggestedRaidLineup } from "../src/domain/raidLineup";
import { resolveRaidSelection, validateRaidSelection, type RaidTeams } from "../src/domain/raidSelection";
import { RAID_MACHINES, suggestedRaidMachine } from "../src/domain/raidMachine";
import meta from "../config/raid_boss_meta.json";
import catalog from "../data/character_catalog.json";

const bosses = meta.bosses as RaidTeams;

test("Rogal Dorn retains source fives, fills missing cores and rejects Astra Militarum", () => {
    const teams = bosses["Rogal Dorn"]!;
    assert.deepEqual(Object.keys(teams), ["Big Hit", "Ad-Mech"]);
    for (const [teamName, team] of Object.entries(teams)) {
        const owned = new Set([...raidCandidates(team), "Biovore", "Malleus Rocket Launcher"]);
        const choice = resolveRaidSelection({ boss: "Rogal Dorn", teamName, flex: [], autoFlex: true }, bosses, owned);
        assert.deepEqual(choice.lineup, team.recommendation!.lineup);
        assert.equal(choice.machine, "Biovore");
        for (const name of ["Sibyll", "Yarrick", "Kut", "Thaddeus", "Creed", "Dreir"]) {
            assert.equal(raidCandidates(team).includes(name), false);
            const lineup = [...team.core.slice(0, 3), team.flex[0]!, name];
            assert.equal(validateRaidSelection({ boss: "Rogal Dorn", teamName, lineup, flex: lineup.filter(unit => !team.core.includes(unit)) }, bosses), null);
        }
        assert.equal(validateRaidSelection({ ...choice, machine: "Malleus Rocket Launcher" }, bosses), null);
        assert.equal(suggestedRaidMachine(team, new Set(["Malleus Rocket Launcher"])), null);
        owned.delete("Vitruvius");
        const substitute = resolveRaidSelection(choice, bosses, owned);
        assert.equal(substitute.lineup!.length, 5);
        assert.equal(new Set(substitute.lineup).size, 5);
        assert.ok(substitute.lineup!.every(name => owned.has(name)));
        if (teamName === "Ad-Mech") assert.equal(substitute.lineup!.includes("Trajann"), false);
    }
});

test("missing core slots use owned substitutes, keep five unique characters and refill on unlock", () => {
    const team = bosses.Riptide!["Ad-Mech"]!;
    const owned = new Set(["Actus", "Exitor-Rho", "Tan Gi'da", "Gulgortz", "Anuphet", "Trajann", "Biovore", "Reanimator"]);
    const saved = { boss: "Riptide", teamName: "Ad-Mech", flex: [], autoFlex: true };
    const first = resolveRaidSelection(saved, bosses, owned);
    assert.deepEqual(first.lineup, ["Actus", "Exitor-Rho", "Tan Gi'da", "Gulgortz", "Anuphet"]);
    assert.equal(first.machine, "Reanimator");
    assert.equal(first.lineup!.includes("Trajann"), false);
    owned.add("Vitruvius");
    const afterUnlock = resolveRaidSelection(first, bosses, owned);
    assert.ok(afterUnlock.lineup!.includes("Vitruvius"));
    assert.equal(afterUnlock.lineup!.length, 5);
    assert.equal(new Set(afterUnlock.lineup).size, 5);
    const sparse = suggestedRaidLineup({ ...team, members: [{ name: "Actus", owned: true }] });
    assert.deepEqual(sparse, ["Actus"]);
});

test("all source defaults prefer cited owned flex and do not smuggle machines into character slots", () => {
    const names = new Set(catalog.characters.map(unit => unit.name));
    for (const [boss, teams] of Object.entries(bosses)) for (const [name, source] of Object.entries(teams)) {
        assert.ok([...source.core, ...source.flex, ...(source.fallbacks ?? [])].every(name => names.has(name)), `${boss}/${name}: unresolved name`);
        const recommendation = source.recommendation;
        if (recommendation) {
            assert.equal(new Set(recommendation.lineup).size, 5);
            assert.deepEqual(new Set([...source.core, ...recommendation.flex]), new Set(recommendation.lineup));
            assert.ok(recommendation.flex.every(name => source.flex.includes(name)));
            assert.ok(recommendation.replays > 0);
        }
        const members = raidCandidates(source).map(name => ({ name, owned: true }));
        const lineup = suggestedRaidLineup({ ...source, members });
        assert.equal(lineup.length, 5, `${boss}/${name}: must field five`);
        assert.equal(new Set(lineup).size, 5);
        assert.ok(lineup.every(name => names.has(name) && !source.excluded?.includes(name)));
        if (recommendation) assert.deepEqual(new Set(lineup), new Set(recommendation.lineup));
        if (name === "Ad-Mech") assert.equal(raidCandidates(source).includes("Trajann"), false);
        const machines = new Set<string>(RAID_MACHINES.map(machine => machine.name));
        const machine = suggestedRaidMachine(source, machines);
        assert.ok(machine && !source.excludedMachines?.includes(machine));
    }
    assert.equal(catalog.characters.find(unit => unit.id === meta._meta.nameEvidence.Atla.id)?.name, meta._meta.nameEvidence.Atla.name);
});

test("boss faction restrictions constrain substitutes and machine fallbacks", () => {
    assert.equal(raidCandidates(bosses.Ghazghkull!["Big Hit"]!).includes("Gulgortz"), false);
    assert.equal(raidCandidates(bosses.Szarekh!["Ad-Mech"]!).includes("Anuphet"), false);
    assert.equal(raidCandidates(bosses["Avatar of Khaine"]!["Ad-Mech"]!).includes("Aethana"), false);
    assert.equal(suggestedRaidMachine(bosses["Hive Tyrant"]!["Ad-Mech"]!, new Set(["Biovore"])), null);
    assert.equal(suggestedRaidMachine(bosses.Riptide!["Ad-Mech"]!, new Set(["Reanimator", "Tson'ji"])), "Reanimator");
    const source = bosses["Hive Tyrant"]!["Big Hit"]!;
    const saved = { boss: "Hive Tyrant", teamName: "Big Hit", flex: [], autoFlex: true };
    const fallback = resolveRaidSelection(saved, bosses, new Set([...source.core, ...source.flex, "Galatian"]));
    assert.equal(fallback.machine, "Galatian");
    const preferred = resolveRaidSelection(fallback, bosses, new Set([...source.core, ...source.flex, "Galatian", "Plagueburst Crawler"]));
    assert.equal(preferred.machine, "Plagueburst Crawler");
    const manual = resolveRaidSelection({ ...fallback, autoMachine: false }, bosses, new Set([...source.core, ...source.flex, "Galatian", "Plagueburst Crawler"]));
    assert.equal(manual.machine, "Galatian");
});
