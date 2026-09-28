import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { abilityActionQueue, abilityGuideRows, abilityLongTermGoals, abilityUpgradePlan, formatAbilityName, targetLevel } from "../src/domain/abilities";
import type { CatalogCharacter } from "../app/lib/catalog";
import type { RosterUnit } from "../app/lib/report";

const catalog: CatalogCharacter[] = JSON.parse(readFileSync("data/character_catalog.json", "utf8")).characters;
const character = catalog[0]!;
const roster: RosterUnit[] = [{ id: character.id, name: "Different display name", faction: "", grandAlliance: "", rarity: "Common", rank: 0, xpLevel: 35, progressionIndex: 0, shards: 0, mythicShards: 0, abilities: [{ id: "a", level: 0 }, { id: "p", level: 9 }], items: [] }];

test("ability IDs are displayed as readable names", () =>
{

    assert.equal(formatAbilityName("InfernalPacts"), "Infernal Pacts");
    assert.equal(formatAbilityName("FirstAmongTraitors"), "First Among Traitors");

});

test("ability target levels use the practical target's lower bound", () =>
{

    assert.equal(targetLevel("35-36"), 35);
    assert.equal(targetLevel("44+"), 44);
    assert.equal(targetLevel("", 35), 35);

});

test("ability plan ranks owned characters matching the selected account goals", () =>
{

    const rows=abilityGuideRows(catalog,roster,{},{});
    const plan=abilityUpgradePlan(rows,{[character.name]:{priority:99,modes:["Guild Raid"]}},["Guild Raid"]);
    assert.equal(plan[0]?.character,character.name);

});

test("direct ability queue chooses the ability-specific priority before raw gap",() =>
{

    const guidance = { [character.name]: { confidence:"medium", active:{practical:"35",high:"44",priority:"low"}, passive:{practical:"26",high:"35",priority:"high"} } };
    const rows=abilityGuideRows(catalog,roster,guidance,{});
    const queue=abilityActionQueue(rows,{[character.name]:{priority:1}},{[character.name]:{score:4,teams:["Core"]}});
    assert.equal(queue[0]?.next.ability,"Passive");

});

test("ability queues separate immediately spendable upgrades from XP-blocked goals",() =>
{

    const guidance = { [character.name]: { confidence:"medium", active:{practical:"44",high:"50",priority:"high"}, passive:{practical:"26",high:"35",priority:"low"} } };
    const rows=abilityGuideRows(catalog,[{...roster[0]!,xpLevel:41,abilities:[{id:"a",level:41},{id:"p",level:26}]}],guidance,{});
    assert.equal(abilityActionQueue(rows,{},{})[0],undefined);
    const goal=abilityLongTermGoals(rows,{},{});
    assert.equal(goal[0]?.next.ability,"Active");
    assert.equal(goal[0]?.xpGap,3);

});

test("full synced catalog remains available without account data, ownership is unknown", () =>
{

    const rows = abilityGuideRows(catalog, null, {}, {});
    assert.equal(rows.length, catalog.length);
    assert.ok(rows.every(r => r.owned === null && r.activeLevel === null && !r.reviewed));

});

test("stable IDs resolve owned units; locked abilities do not enter baseline queue", () =>
{

    const row = abilityGuideRows(catalog, roster, {}, {})[0]!;
    assert.equal(row.owned, true);
    assert.equal(row.activeTo17, false);
    assert.equal(row.passiveTo17, true);
    assert.equal(row.communityActiveTarget, "17 provisional baseline");
    assert.equal(row.activeHigh, "Not researched");
    assert.equal(row.activeTargetLevel, 17);
    assert.equal(row.passiveTargetLevel, 17);
    assert.equal(row.reviewed, false);

});

test("every owned catalog character has a real planning floor without fabricating a researched target", () =>
{
    const report = JSON.parse(readFileSync("output/upgrade-report.json", "utf8")) as { roster:RosterUnit[] };
    const guidance = JSON.parse(readFileSync("config/ability_breakpoints.json", "utf8")) as Record<string,unknown>;
    const rows = abilityGuideRows(catalog, report.roster, guidance, {}).filter(row => row.owned);
    const catalogIds = new Set(catalog.map(unit => unit.id));
    assert.equal(rows.length, report.roster.filter(unit => catalogIds.has(unit.id)).length);
    assert.ok(rows.every(row => Number.isInteger(row.activeTargetLevel) && Number.isInteger(row.passiveTargetLevel)));
    assert.ok(rows.filter(row => !row.reviewed).every(row => row.activeTargetLevel === 17 && row.passiveTargetLevel === 17 && row.activeHigh === "Not researched"));
});

test("every previously unreviewed owned character has an explicit, distinct planning recommendation", () =>
{
    const report = JSON.parse(readFileSync("output/upgrade-report.json", "utf8")) as { roster:RosterUnit[] };
    const reviewed = JSON.parse(readFileSync("config/ability_breakpoints.json", "utf8")) as Record<string,unknown>;
    const planning = JSON.parse(readFileSync("config/owned_ability_recommendations.json", "utf8")) as Record<string,{active:number;passive:number;note:string;source?:string}>;
    const owned = new Set(report.roster.map(unit => unit.id));
    const missing = catalog.filter(character => owned.has(character.id) && !reviewed[character.name]);
    assert.equal(missing.length, 51);
    assert.deepEqual(Object.keys(planning).filter(name => name !== "_meta").sort(),missing.map(character => character.name).sort());
    for(const character of missing){const entry=planning[character.name]!;assert.ok(Number.isInteger(entry.active) && entry.active >= 1 && entry.active <= 50,character.name);assert.ok(Number.isInteger(entry.passive) && entry.passive >= 1 && entry.passive <= 50,character.name);assert.ok(entry.note.length > 25,character.name);}
    const combined = {...Object.fromEntries(Object.entries(planning).filter(([name]) => name !== "_meta").map(([name,entry]) => [name,{active:{practical:String(entry.active)},passive:{practical:String(entry.passive)},confidence:"planning"}])),...reviewed};
    const rows = abilityGuideRows(catalog,report.roster,combined,{}).filter(row => row.owned);
    assert.ok(rows.every(row => row.recommended));
    assert.ok(rows.filter(row => missing.some(character => character.id === row.id)).every(row => !row.reviewed));
});

test("unowned is distinct from unknown account or missing levels", () =>
{

    const rows = abilityGuideRows(catalog, [], {}, {});
    assert.ok(rows.every(r => r.owned === false && r.activeLevel === null && !r.activeTo17));
    const missing = abilityGuideRows(catalog, [{ ...roster[0]!, abilities: [] }], {}, {})[0]!;
    assert.equal(missing.owned, true);
    assert.equal(missing.activeLevel, null);

});

test("baseline-only guidance and incomplete research cannot count as reviewed", () =>
{

    for (const guidance of [{ confidence: "high" }, { confidence: "baseline-only", active: { practical: "17" }, passive: { practical: "17" } }])
        assert.equal(abilityGuideRows(catalog, roster, { [character.name]: guidance }, {})[0]!.reviewed, false);

});

test("research targets remain distinct from baseline flags and account priority", () =>
{

    const guidance = { confidence: "medium", active: { practical: "26", high: "35", priority: "high", note: "Test research fixture", modes: [] }, passive: { practical: "35", high: "44", priority: "medium", note: "Test research fixture", modes: [] } };
    const row = abilityGuideRows(catalog, roster, { [character.name]: guidance }, { [character.name]: { priority: 99 } })[0]!;
    assert.equal(row.reviewed, true);
    assert.equal(row.communityPassiveTarget, "35");
    assert.equal(row.passiveTo17, true);
    assert.equal(row.accountPriority, 99);

});
