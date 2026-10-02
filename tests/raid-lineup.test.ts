import assert from "node:assert/strict";
import test from "node:test";
import { suggestedRaidFlex } from "../src/domain/raidLineup";
import meta from "../config/raid_boss_meta.json";
import catalog from "../data/character_catalog.json";
import type { RaidTeams } from "../src/domain/raidSelection";

const team={core:["Kariyan","Laviscus","Trajann"],flex:["Aesoth","Gulgortz","Kharn"],members:["Kariyan","Laviscus","Trajann","Aesoth","Gulgortz","Kharn"].map(name=>({name,owned:true}))};

test("owned flex fills available slots even while a core unlock is pending",()=>{
    assert.deepEqual(suggestedRaidFlex("Avatar of Khaine","Big Hit",{...team,members:team.members.filter(member=>member.name!=="Laviscus")}),["Aesoth","Gulgortz"]);
    assert.deepEqual(suggestedRaidFlex("Avatar of Khaine","Big Hit",{...team,members:team.members.filter(member=>member.name!=="Gulgortz")}),["Aesoth","Kharn"]);
});

test("boss recommendations choose the owned preferred flex rather than alphabetical alternatives", () => {
    const bosses = meta.bosses as RaidTeams;
    for (const [boss, name, expected] of [
        ["Avatar of Khaine", "Big Hit", ["Gulgortz", "Kharn"]],
        ["Belisarius Cawl", "Big Hit", ["Kharn", "Dante"]],
        ["Ghazghkull", "Big Hit", ["Aesoth", "Vitruvius"]],
        ["Mortarion", "Big Hit", ["Gulgortz", "Atlacoya"]],
        ["Hive Tyrant", "Big Hit", ["Gulgortz", "Atlacoya"]],
        ["Magnus", "Custodes", ["Ragnar", "Helbrecht"]],
        ["Screamer-Killer", "Lavistodes", ["Aesoth"]],
        ["Tervigon", "Lavistodes", ["Atlacoya"]]
    ] as const) {
        const source = bosses[boss]![name]!;
        const members = [...source.core, ...source.flex].map(name => ({ name, owned: true }));
        assert.deepEqual(suggestedRaidFlex(boss, name, { ...source, members }), expected);
    }
});

test("every recommendation is exactly five eligible catalog characters and fills at most five slots", () => {
    const names = new Set(catalog.characters.map(unit => unit.name));
    for (const [boss, teams] of Object.entries(meta.bosses as RaidTeams)) for (const [name, source] of Object.entries(teams)) {
        assert.ok([...source.core, ...source.flex].every(name => names.has(name)), `${boss}/${name}: unresolved name`);
        const recommendation = source.recommendation;
        if (recommendation) {
            assert.equal(new Set(recommendation.lineup).size, 5);
            assert.deepEqual(new Set([...source.core, ...recommendation.flex]), new Set(recommendation.lineup));
            assert.ok(recommendation.flex.every(name => source.flex.includes(name)));
            assert.ok(recommendation.replays > 0);
        }
        const members = [...source.core, ...source.flex].map((name, index) => ({ name, owned: index % 2 === 0 }));
        const flex = suggestedRaidFlex(boss, name, { ...source, members });
        assert.ok(flex.every(name => members.some(member => member.name === name && member.owned)));
        assert.ok(source.core.length + flex.length <= 5);
        assert.equal(new Set(flex).size, flex.length);
    }
    assert.equal(catalog.characters.find(unit => unit.id === meta._meta.nameEvidence.Atla.id)?.name, meta._meta.nameEvidence.Atla.name);
});
