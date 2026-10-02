import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { campaignKey } from "../src/domain/campaigns";
import { eliteFarmingGaps, eliteUnlockOpportunities, filterEliteGaps } from "../src/domain/eliteFarmingGaps";
import { farmNodesFor, type CampaignBattle } from "../src/domain/farmingSources";
import type { Recipe } from "../src/domain/farming";
import type { MaterialCompletionRow } from "../src/domain/materialCompletion";

const leaf = (id: string, rarity = "Common"): Recipe => ({ material: id, snowprintId: id, rarity, stat: "Health", craftable: false });
const recipes = { ore: leaf("ore"), dust: leaf("dust"), mythic: leaf("mythic", "Mythic"), recipeOnly: leaf("recipeOnly"), noFarm: leaf("noFarm") };
const node = (material: string, campaign: string, type: string, number: number, energy = 10, rate = 1): CampaignBattle => ({ campaign, campaignType: type, nodeNumber: number, energyCost: energy, rewards: { potential: [{ id: material, effective_rate: rate }] } });
const battles = {
    normal: node("ore", "Test", "Standard", 1, 6, 0.2), mirror: node("ore", "Test Mirror", "Mirror", 1, 6, 0.5),
    elite: node("ore", "Test Elite", "Elite", 2), later: node("ore", "Test Elite", "Elite", 6, 10, 2),
    mirrorElite: node("ore", "Test Mirror Elite", "Elite", 3),
    dust: node("dust", "Test", "Standard", 2), mythic: node("mythic", "Test", "Standard", 3),
    shard: node("shards_test", "Test", "Standard", 2), zero: node("noFarm", "Test", "Standard", 1, 0), zeroRate: node("noFarm", "Test", "Standard", 2, 10, 0)
};
const progress = { Test: 5, "Test Mirror": 1, "Test Elite": 1, "Test Mirror Elite": 1 };
const demand = (id: string, shortage: number, status: MaterialCompletionRow["status"] = "farming"): MaterialCompletionRow => ({
    id, name: id, rarity: "Common", craftable: false, inventory: 7, remaining: 25, required: 17, allocated: 7, shortage, surplus: 0, unowned: 10, status,
    recipients: [{ id: "a", name: "A", owned: true, lifetime: 30, remaining: 25, direct: 0, crafting: 25 }, { id: "b", name: "B", owned: false, lifetime: 10, remaining: 10, direct: 10, crafting: 0 }]
});

test("any unlocked Elite source removes a material, including mirror alternatives", () => {
    assert.equal(eliteFarmingGaps({ recipes, battles, progress: { ...progress, "Test Mirror Elite": 3 } }).some(row => row.id === "ore"), false);
    assert.equal(eliteFarmingGaps({ recipes, battles, progress }).find(row => row.id === "ore")!.eliteNodes.length, 3);
});

test("locked, unknown and no-Elite source remain distinct; missing progress is not zero", () => {
    const rows = eliteFarmingGaps({ recipes, battles, progress: {} });
    assert.equal(rows.find(row => row.id === "ore")!.coverage, "unknown");
    assert.equal(rows.find(row => row.id === "dust")!.coverage, "no-elite");
    assert.equal(eliteFarmingGaps({ recipes, battles, progress }).find(row => row.id === "ore")!.coverage, "locked");
    assert.equal(eliteFarmingGaps({ recipes, battles, progress: { "Test Elite": 0, "Test Mirror Elite": 0 } }).find(row => row.id === "ore")!.coverage, "locked");
    const invalid = farmNodesFor("ore", battles, { "Test Elite": NaN, "Test Mirror Elite": -1 });
    assert.ok(invalid.every(node => node.access === "unknown"));
});

test("only farmable upgrade materials are included; shards, zero yield and recipe-only costs are excluded", () => {
    assert.deepEqual(eliteFarmingGaps({ recipes, battles, progress }).map(row => row.id), ["dust", "mythic", "ore"]);
    const guaranteed = { ...battles, guaranteed: { ...node("noFarm", "Test", "Standard", 3), rewards: { guaranteed: [{ id: "noFarm", min: 2, max: 2 }] } } };
    assert.equal(eliteFarmingGaps({ recipes, battles: guaranteed, progress }).find(row => row.id === "noFarm")!.alternative!.rate, 2);
});

test("recipient demand includes owned crafting uses and preserves shared-inventory shortage", () => {
    const row = eliteFarmingGaps({ recipes, battles, progress, completion: [demand("ore", 10)] }).find(row => row.id === "ore")!;
    assert.equal(row.shortage, 10);
    assert.equal(row.remaining, 25);
    assert.equal(row.inventory, 7);
    assert.deepEqual(row.characters.map(character => character.id), ["a"]);
    assert.equal(row.alternative!.id, "mirror");
});

test("Mythic and finished/stocked filters compose and do not hide unknown demand", () => {
    const rows = eliteFarmingGaps({ recipes, battles, progress, completion: [demand("ore", 0, "stocked")] });
    assert.deepEqual(filterEliteGaps(rows, { includeMythic: false, onlyNeeded: false }).map(row => row.id), ["dust", "ore"]);
    assert.deepEqual(filterEliteGaps(rows, { includeMythic: false, onlyNeeded: true }).map(row => row.id), ["dust"]);
    assert.equal(filterEliteGaps(rows, { includeMythic: true, onlyNeeded: false }).length, 3);
});

test("campaign opportunities use earliest unlock once per material and calculate expected savings", () => {
    const rows = eliteFarmingGaps({ recipes, battles, progress, completion: [demand("ore", 10)] });
    const opportunities = eliteUnlockOpportunities(rows, progress);
    assert.equal(opportunities.length, 2);
    const normal = opportunities.find(row => row.campaign === "Test Elite")!;
    assert.equal(normal.nextNode, 2);
    assert.equal(normal.targetNode, 2);
    assert.equal(normal.frontier, 1);
    assert.equal(normal.materials.length, 1);
    assert.equal(normal.estimatedSavings, 20); // 10 × (6/0.5 - 10/1), using best unlocked Mirror.
});

test("unknown Elite progress never produces a guessed push recommendation", () => {
    const rows = eliteFarmingGaps({ recipes, battles, progress: { Test: 5, "Test Elite": 1 }, completion: [demand("ore", 10)] });
    assert.equal(rows.find(row => row.id === "ore")!.coverage, "unknown");
    assert.equal(eliteUnlockOpportunities(rows, { Test: 5, "Test Elite": 1 }).length, 0);
    assert.equal(eliteUnlockOpportunities(eliteFarmingGaps({ recipes, battles, progress }), progress).length, 0);
});

test("no unlocked alternative gives unknown savings; a cheaper existing source cannot yield negative savings", () => {
    const rows = eliteFarmingGaps({ recipes, battles, progress: { "Test Elite": 1, "Test Mirror Elite": 1 }, completion: [demand("ore", 10)] });
    const opportunities = eliteUnlockOpportunities(rows, { "Test Elite": 1, "Test Mirror Elite": 1 });
    assert.equal(opportunities[0]!.materials[0]!.estimatedSavings, null);
    assert.equal(opportunities[0]!.comparedMaterials, 0);
    const cheap = { ...battles, cheap: node("ore", "Test", "Standard", 3, 1, 1) };
    assert.equal(eliteUnlockOpportunities(eliteFarmingGaps({ recipes, battles: cheap, progress, completion: [demand("ore", 10)] }), progress)[0]!.estimatedSavings, 0);
});

test("campaign targets include all separate missing materials without duplicating alternate nodes", () => {
    const extra = { ...battles, dustElite: node("dust", "Test Elite", "Elite", 5) };
    const rows = eliteFarmingGaps({ recipes, battles: extra, progress, completion: [demand("ore", 10), demand("dust", 20)] });
    const opportunity = eliteUnlockOpportunities(rows, progress).find(row => row.campaign === "Test Elite")!;
    assert.equal(opportunity.targetNode, 5);
    assert.equal(opportunity.materials.length, 2);
    assert.deepEqual(opportunity.materials.map(material => material.node.nodeNumber), [2, 5]);
});

test("full synced dataset obeys exhaustive removal and retains materials with no Elite source", () => {
    const recipeData = JSON.parse(readFileSync("data/game/upgrade-recipes.json", "utf8"));
    const battleData: Record<string, CampaignBattle> = JSON.parse(readFileSync("data/game/campaign-battles.json", "utf8"));
    const all = eliteFarmingGaps({ recipes: recipeData, battles: battleData, progress: {} });
    const unlocked = Object.fromEntries(Object.values(battleData).map(battle => [campaignKey(battle.campaign, battle.campaignType), 1000]));
    const remaining = eliteFarmingGaps({ recipes: recipeData, battles: battleData, progress: unlocked });
    assert.ok(all.length > 150);
    assert.ok(remaining.length > 0);
    assert.ok(remaining.every(row => row.coverage === "no-elite"));
    assert.equal(remaining.length, all.filter(row => row.coverage === "no-elite").length);
    for (const row of all) assert.equal(row.coverage === "no-elite", row.eliteNodes.length === 0);
});
