import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { materialCompletion } from "../src/domain/materialCompletion";
import { type Recipe } from "../src/domain/farming";

const leaf = (id: string): Recipe => ({ snowprintId: id, material: id, rarity: "Common", stat: "Health", craftable: false });
const recipes: Record<string, Recipe> = {
    ore: leaf("ore"), dust: leaf("dust"), past: leaf("past"),
    part: { ...leaf("part"), craftable: true, recipe: [{ material: "ore", count: 3 }] },
    finished: { ...leaf("finished"), craftable: true, recipe: [{ material: "part", count: 2 }, { material: "dust", count: 1 }] }
};
const catalog = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
const progression = { "Stone I": Array(6).fill("past") as string[], "Stone II": ["finished", "finished", "dust", "dust", "dust", "dust"] };
const ranks = { a: progression, b: progression };
const roster = [{ ...catalog[0]!, rank: 1, upgrades: [] as number[] }];
const input = { catalog, roster, ranks, recipes, inventory: [], targetRank: 2 };

test("all recursive levels and per-character direct/crafted use are tracked", () => {
    const rows = materialCompletion(input);
    const ore = rows.find(row => row.id === "ore")!;
    assert.equal(ore.remaining, 12);
    assert.equal(ore.unowned, 12);
    assert.equal(ore.shortage, 12);
    assert.equal(ore.recipients[0]!.direct, 0);
    assert.equal(ore.recipients[0]!.crafting, 12);
    assert.equal(rows.find(row => row.id === "finished")!.remaining, 2);
    const dust = rows.find(row => row.id === "dust")!.recipients[0]!;
    assert.equal(dust.direct, 4);
    assert.equal(dust.crafting, 2);
});

test("finished/intermediate stock is shared once and prevents double-counting ingredients", () => {
    const rows = materialCompletion({ ...input, roster: [...roster, { ...catalog[1]!, rank: 1, upgrades: [] }], inventory: [
        { id: "finished", amount: 1 }, { id: "part", amount: 1 }, { id: "ore", amount: 2 }
    ] });
    const ore = rows.find(row => row.id === "ore")!;
    assert.equal(ore.remaining, 24);
    assert.equal(ore.required, 15);
    assert.equal(ore.allocated, 2);
    assert.equal(ore.shortage, 13);
    assert.equal(ore.surplus, 0);
});

test("stocked is distinct from done, even when owned parent upgrades cover all ingredients", () => {
    const rows = materialCompletion({ ...input, inventory: [{ id: "finished", amount: 2 }, { id: "dust", amount: 4 }] });
    const ore = rows.find(row => row.id === "ore")!;
    assert.equal(ore.status, "stocked");
    assert.equal(ore.remaining, 12);
    assert.equal(ore.required, 0);
    assert.equal(ore.shortage, 0);
    assert.equal(rows.find(row => row.id === "past")!.status, "done-owned");
});

test("done for catalog requires no remaining uses for either owned or unowned characters", () => {
    const rows = materialCompletion({ ...input, roster: [...roster, { ...catalog[1]!, rank: 2 }] });
    assert.equal(rows.find(row => row.id === "past")!.status, "done-catalog");
    assert.equal(rows.find(row => row.id === "ore")!.status, "farming");
    assert.ok(materialCompletion({ ...input, roster: catalog.map(character => ({ ...character, rank: 2 })) }).every(row => row.status === "done-catalog"));
});

test("equipped slots are omitted only at the current rank, independent of rarity gates", () => {
    const rows = materialCompletion({ ...input, roster: [{ ...roster[0]!, upgrades: [0, 1, 1] }] });
    assert.equal(rows.find(row => row.id === "ore")!.remaining, 0);
    assert.equal(rows.find(row => row.id === "ore")!.status, "done-owned");
    assert.equal(rows.find(row => row.id === "dust")!.remaining, 4);
    const start = materialCompletion({ ...input, roster: [{ ...roster[0]!, rank: 0, upgrades: [0, 1] }] });
    assert.equal(start.find(row => row.id === "ore")!.remaining, 12);
});

test("chosen rank ceiling is exclusive and does not consume terminal placeholders", () => {
    const coming = { ...leaf("future"), material: "Coming soon" };
    const capped = materialCompletion({ ...input, catalog: [catalog[0]!], roster: [{ ...roster[0]!, rank: 1 }], targetRank: 1,
        ranks: { a: { ...progression, "Stone II": Array(6).fill("future") } }, recipes: { ...recipes, future: coming } });
    assert.ok(capped.every(row => row.status === "done-catalog"));
    assert.throws(() => materialCompletion({ ...input, recipes: { ...recipes, finished: coming } }), /Missing or mismatched/);
    assert.throws(() => materialCompletion({ ...input, recipes: { ...recipes, finished: { ...recipes.finished!, material: "Coming soon" } } }), /Unknown future/);
});

test("missing progress, inventory, recipes and cycles block completion claims", () => {
    assert.throws(() => materialCompletion({ ...input, inventory: undefined }), /inventory unavailable/);
    assert.throws(() => materialCompletion({ ...input, roster: [{ ...catalog[0]!, rank: 1 }] }), /equipped upgrade slots unavailable/);
    assert.throws(() => materialCompletion({ ...input, ranks: { a: progression } }), /missing recipe/);
    assert.throws(() => materialCompletion({ ...input, targetRank: 20 }), /rank ceiling/);
    assert.throws(() => materialCompletion({ ...input, roster: [{ ...roster[0]!, rank: 99 }] }), /unknown rank/);
    const invalid = { ...recipes, ore: { ...leaf("ore"), craftable: true, recipe: [{ material: "finished", count: 1 }] } };
    assert.throws(() => materialCompletion({ ...input, recipes: invalid, inventory: [{ id: "finished", amount: 2 }] }), /cycle/);
    assert.throws(() => materialCompletion({ ...input, inventory: [{ id: "ore", amount: -1 }] }), /Invalid inventory/);
});

test("untracked inventory is never marked done or safe surplus; machines are excluded", () => {
    const rows = materialCompletion({ ...input, roster: [...roster, { id: "machine", name: "Machine", rank: 999 }], inventory: [{ id: "unknown", amount: 9 }, { id: "ore", amount: 10 }, { id: "ore", amount: 10 }] });
    const unknown = rows.find(row => row.id === "unknown")!;
    assert.equal(unknown.status, "untracked");
    assert.equal(unknown.inventory, 9);
    assert.equal(rows.find(row => row.id === "ore")!.inventory, 20);
    assert.equal(rows.find(row => row.id === "ore")!.surplus, 8);
    assert.throws(() => materialCompletion({ ...input, roster: [...roster, ...roster] }), /Duplicate owned/);
});

test("full synced catalog expands through Adamantine II without treating placeholders as materials", () => {
    const rankData = JSON.parse(readFileSync("data/game/rank-up-data.json", "utf8"));
    const recipeData = JSON.parse(readFileSync("data/game/upgrade-recipes.json", "utf8"));
    const characterData = JSON.parse(readFileSync("data/character_catalog.json", "utf8"));
    const rows = materialCompletion({ catalog: characterData.characters, roster: [], ranks: rankData, recipes: recipeData, inventory: [] });
    assert.ok(rows.length > 400);
    assert.ok(rows.every(row => row.name !== "Coming soon" && row.unowned > 0));
    const chip = rows.find(row => row.name === "Engram Neurochip")!;
    assert.ok(chip.recipients.some(recipient => recipient.name === "Sho'syl"));
    assert.ok(chip.recipients.every(recipient => recipient.remaining === recipient.lifetime));
});
