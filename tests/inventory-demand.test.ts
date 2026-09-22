import assert from "node:assert/strict";
import test from "node:test";
import { inventoryDemandTargets } from "../src/domain/inventoryDemand";

test("inventory demand joins gear requirements by stable item ID, not display name", () =>
{

    const targets = inventoryDemandTargets([
        { character: "Kharn", accountPriority: 90, preferredLegendaryItemIds: ["I_Block_L003"], preferredLegendaryItems: ["Optimal Force Field"] },
        { character: "Trajann", accountPriority: 80, recommendedItemId: "I_Block_L003", recommendedItem: "Force Field (localized name)" }
    ]);
    assert.deepEqual(targets.map(target => target.itemId), ["I_Block_L003", "I_Block_L003"]);
    assert.equal(targets[0]!.itemName, "Optimal Force Field");

});

test("inventory demand does not invent an exact item when a slot has alternatives", () =>
{

    const targets = inventoryDemandTargets([
        { character: "Choice", accountPriority: 50, preferredLegendaryItemIds: ["I_Block_L003", "I_Block_L004"], preferredLegendaryItems: ["Field A", "Field B"] },
        { character: "Exact", accountPriority: 50, recommendedItemId: "I_Block_L003", recommendedItem: "Field A" }
    ]);
    assert.deepEqual(targets.map(target => [target.character, target.itemId]), [["Exact", "I_Block_L003"]]);

});
