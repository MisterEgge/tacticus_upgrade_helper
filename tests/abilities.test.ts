import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { abilityGuideRows, formatAbilityName, targetLevel } from "../src/domain/abilities";
import type { CatalogCharacter } from "../app/lib/catalog";
import type { RosterUnit } from "../app/lib/report";

const catalog: CatalogCharacter[] = JSON.parse(readFileSync("data/character_catalog.json", "utf8")).characters;
const character = catalog[0]!;
const roster: RosterUnit[] = [{ id: character.id, name: "Different display name", faction: "", grandAlliance: "", rarity: "Common", rank: 0, xpLevel: 1, progressionIndex: 0, shards: 0, mythicShards: 0, abilities: [{ id: "a", level: 0 }, { id: "p", level: 9 }], items: [] }];

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
    assert.equal(row.communityActiveTarget, "17 baseline · 35 general stop");
    assert.equal(row.activeHigh, "44–50 high investment");
    assert.equal(row.reviewed, false);

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
