import assert from "node:assert/strict";
import test from "node:test";
import { collapseCampaignGoals } from "../src/domain/campaignGoals";

test("campaign goals collapse duplicate characters to the highest justified target", () =>
{

    const goals = collapseCampaignGoals([
        { id: "same", name: "Same", currentRank: 9, targetRank: 12, priority: 50, confidence: "medium" },
        { id: "same", name: "Same", currentRank: 9, targetRank: 14, priority: 40, confidence: "medium" },
        { id: "same", name: "Same", currentRank: 9, targetRank: 13, priority: 99, confidence: "high" }
    ]);
    assert.equal(goals.length, 1);
    assert.equal(goals[0]!.targetRank, 14);

});

test("low-confidence campaign targets are display-only and never auto-farmed", () =>
{

    const goals = collapseCampaignGoals([
        { id: "low", name: "Low", currentRank: 9, targetRank: 14, priority: 100, confidence: "low" },
        { id: "medium", name: "Medium", currentRank: 9, targetRank: 12, priority: 20, confidence: "medium" }
    ]);
    assert.deepEqual(goals.map(goal => goal.id), ["medium"]);

});
