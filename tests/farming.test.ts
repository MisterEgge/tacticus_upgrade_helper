import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { expandMaterial, planMaterials, rankMaterials, type RankGoal, type Recipe } from "../src/domain/farming";
import { bestFarmNode, farmNodesFor } from "../app/lib/farming";

const leaf = (id: string): Recipe => ({ snowprintId: id, material: id, rarity: "Common", stat: "Health", craftable: false });
const recipes: Record<string, Recipe> = {
    ore: leaf("ore"), dust: leaf("dust"),
    part: { ...leaf("part"), craftable: true, recipe: [{ material: "ore", count: 3 }] },
    finished: { ...leaf("finished"), craftable: true, recipe: [{ material: "part", count: 2 }, { material: "dust", count: 1 }] }
};
const ranks = { test: { "Stone I": ["finished", "finished", "dust", "dust", "dust", "dust"], "Stone II": Array(6).fill("ore") as string[] } };
const goal: RankGoal = { id: "test", name: "Test", currentRank: 0, targetRank: 1, upgrades: [], priority: 1 };

test("multi-rank requirements omit equipped slots only from current rank", () =>
{

    assert.deepEqual(rankMaterials({ ...goal, targetRank: 2, upgrades: [0, 1, 1, 5] }, ranks), ["dust", "dust", "dust", ...Array(6).fill("ore")]);
    assert.deepEqual(rankMaterials({ ...goal, targetRank: 0 }, ranks), []);

});

test("missing equipped slots or rank recipe is unknown, never a fabricated complete plan", () =>
{

    const { upgrades, ...missing } = goal;
    assert.throws(() => rankMaterials(missing, ranks), /unavailable/);
    assert.throws(() => rankMaterials({ ...goal, upgrades: [-1] }, ranks), /unavailable/);
    assert.throws(() => rankMaterials({ ...goal, targetRank: 3 }, ranks), /missing recipe/);
    assert.throws(() => rankMaterials({ ...goal, targetRank: NaN }, ranks), /unknown rank/);

});

test("recursive material expansion accumulates stable IDs", () =>
{

    assert.deepEqual([...expandMaterial("finished", 2, recipes)], [["ore", 12], ["dust", 2]]);

});

test("finished, intermediate and base inventory are deducted at their own level", () =>
{

    const demand = planMaterials([goal], ranks, recipes, [{ id: "finished", amount: 1 }, { id: "part", amount: 1 }, { id: "ore", amount: 2 }]);
    assert.equal(demand.get("ore")!.needed, 3);
    assert.equal(demand.get("ore")!.shortage, 1);
    assert.equal(demand.get("dust")!.shortage, 5);

});

test("owned crafted inventory can satisfy a full goal without expanding ingredients", () =>
{

    const demand = planMaterials([goal], ranks, recipes, [{ id: "finished", amount: 2 }, { id: "dust", amount: 4 }]);
    assert.equal(demand.has("ore"), false);
    assert.equal(demand.get("dust")!.shortage, 0);

});

test("inventory is shared once across characters in priority order", () =>
{

    const allRanks = { ...ranks, other: ranks.test };
    const demand = planMaterials([{ ...goal, priority: 1 }, { ...goal, id: "other", name: "High", priority: 100 }], allRanks, recipes, [{ id: "finished", amount: 2 }, { id: "dust", amount: 4 }]);
    assert.equal(demand.get("ore")!.shortage, 12);
    assert.deepEqual(demand.get("ore")!.characters, [{ name: "Test", priority: 1 }]);
    assert.throws(() => planMaterials([goal, goal], ranks, recipes, []), /Duplicate/);

});

test("invalid recipes and cycles fail visibly instead of producing understated shortages", () =>
{

    assert.throws(() => expandMaterial("missing", 1, recipes), /Missing/);
    assert.throws(() => expandMaterial("bad", 1, { bad: { ...leaf("bad"), craftable: true } }), /Invalid/);
    assert.throws(() => expandMaterial("loop", 1, { loop: { ...leaf("loop"), craftable: true, recipe: [{ material: "loop", count: 1 }] } }), /cycle/);
    assert.throws(() => expandMaterial("ore", -1, recipes), /Invalid/);
    assert.throws(() => planMaterials([goal], ranks, recipes, [{ id: "ore", amount: -1 }]), /Invalid/);

});

test("best source excludes locked and zero-energy nodes and uses yield per energy", () =>
{

    const battle = (nodeNumber: number, energyCost: number, rate: number) => ({ campaign: "Test Elite", campaignType: "Elite", nodeNumber, energyCost, rewards: { potential: [{ id: "ore", effective_rate: rate }] } });
    const battles = { cheap: battle(1, 6, 1), costly: battle(2, 10, 1), locked: battle(3, 6, 3), zero: battle(1, 0, 1) };
    assert.equal(bestFarmNode("ore", battles, { "Test Elite": 2 })?.id, "cheap");
    assert.equal(bestFarmNode("ore", battles, {}), undefined);
    assert.equal(farmNodesFor("ore", battles, { "Test Elite": 3 }).some(n => n.id === "zero"), false);

});

test("real synced Bellator multi-rank recipes expand to known material IDs", () =>
{

    const rankData = JSON.parse(readFileSync("data/game/rank-up-data.json", "utf8"));
    const recipeData = JSON.parse(readFileSync("data/game/upgrade-recipes.json", "utf8"));
    const plan = planMaterials([{ ...goal, id: "ultraInceptorSgt", currentRank: 9, targetRank: 12 }], rankData, recipeData, []);
    assert.ok(plan.size > 0);
    assert.ok([...plan].every(([id, row]) => recipeData[id] && row.shortage > 0));

});
