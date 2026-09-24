import assert from "node:assert/strict";
import test from "node:test";
import {badgeCostBetween,totalBadgeCosts}from "../src/domain/abilityCosts";

test("ability badge costs calculate exact tier costs through the uncommon cap",()=>
{
 assert.deepEqual(badgeCostBetween(8,17),{Uncommon:21});
 assert.deepEqual(badgeCostBetween(12,17),{Uncommon:16});
 assert.deepEqual(totalBadgeCosts([badgeCostBetween(8,17),badgeCostBetween(12,17)]),{Uncommon:37});
});

test("ability badge costs retain the legendary tail instead of assuming the lower-tier curve",()=>assert.deepEqual(badgeCostBetween(44,50),{Legendary:45}));
