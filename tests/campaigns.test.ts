import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { abilityGap, advancedCampaigns, campaignRecommendationPriority, buildCampaignSnapshot, campaignKey, campaignProgress, campaignRankGap, requiredCampaignName, type Campaign, type CampaignCharacter, type SnapshotPlayer } from "../src/domain/campaigns";
import { farmNodesFor, progressFromApi, progressFromReport } from "../app/lib/farming";

const campaign: Campaign = { id: "mirror", name: "Indomitus", type: "EliteMirror", battles: [{ battleIndex: 38 }] };
const characters: CampaignCharacter[] = JSON.parse(readFileSync("data/character_catalog.json", "utf8")).characters;
const player: SnapshotPlayer = { metaData: { lastUpdatedOn: 100 }, player: { units: [{ id: "necroSpyder", rank: 10, progressionIndex: 12, abilities: [{ id: "a", level: 17 }, { id: "p", level: 9 }] }], progress: { campaigns: [campaign] } } };
const snapshot = () => buildCampaignSnapshot(player, characters, "2026-09-20T00:00:00Z");

test("unlocked 39 proves completion only through 38 and never proves stars", () =>
{

    assert.deepEqual(campaignProgress(campaign), { highestUnlockedBattle: 39, highestCompletedBattle: 38, highestConfirmedThreeStarBattle: null });

});

test("empty, missing, malformed, first battle, and terminal sentinel remain distinct", () =>
{

    assert.equal(campaignProgress({ ...campaign, battles: [] }).highestCompletedBattle, 0);
    const { battles, ...missing } = campaign;
    assert.equal(campaignProgress(missing).highestCompletedBattle, null);
    for (const battleIndex of [-1, 1.5, NaN, 76]) assert.equal(campaignProgress({ ...campaign, battles: [{ battleIndex }] }).highestCompletedBattle, null);
    assert.equal(campaignProgress({ ...campaign, battles: [{ battleIndex: 0 }] }).highestCompletedBattle, 0);
    assert.equal(campaignProgress({ ...campaign, battles: [{ battleIndex: 75 }] }).highestCompletedBattle, 75);

});

test("campaign variants normalize once and keep Mirror distinct", () =>
{

    for (const name of ["Indomitus", "Indomitus Mirror", "Indomitus Mirror Elite", "Indomitus Elite Mirror"])
        assert.equal(campaignKey(name, "EliteMirror"), "Indomitus Mirror Elite");
    assert.equal(requiredCampaignName(campaign), "Indomitus Mirror");
    assert.equal(campaignKey("Indomitus", "Elite"), "Indomitus Elite");
    assert.notEqual(campaignKey("Tyranids Standard Challenge", "Standard"), campaignKey("Tyranids", "Standard"));

});

test("snapshots select Mirror mandatory characters and join unnamed API units by stable ID", () =>
{

    const c = snapshot().campaigns.mirror!;
    assert.deepEqual(c.requiredCharacters.map(u => u.name), ["Makhotep", "Imospekh", "Aleph-Null"]);
    const aleph = c.requiredCharacters.find(u => u.id === "necroSpyder")!;
    assert.equal(aleph.rank, 10);
    assert.equal(aleph.activeLevel, 17);
    assert.equal(c.requiredCharacters[0]!.rank, null);

});

test("baseline, unchanged progress and rank-only changes are not milestones", () =>
{

    const baseline = snapshot();
    assert.deepEqual(advancedCampaigns(baseline, []), []);
    assert.deepEqual(advancedCampaigns(snapshot(), [baseline]), []);
    const changed = snapshot();
    changed.campaigns.mirror!.requiredCharacters[2]!.rank = 12;
    assert.deepEqual(advancedCampaigns(changed, [baseline]), []);
    changed.campaigns.mirror!.highestCompletedBattle = 39;
    assert.deepEqual(advancedCampaigns(changed, [baseline]), ["mirror"]);

});

test("regressed or missing observations do not create duplicate milestones", () =>
{

    const previous = snapshot();
    const regressed = snapshot();
    regressed.campaigns.mirror!.highestCompletedBattle = 20;
    assert.deepEqual(advancedCampaigns(snapshot(), [previous, regressed]), []);
    const missing = snapshot();
    missing.campaigns = {};
    assert.deepEqual(advancedCampaigns(snapshot(), [previous, missing]), []);

});

test("actual synced Mirror Elite nodes match API unlocks without double suffixes", () =>
{

    const battles = JSON.parse(readFileSync("data/game/campaign-battles.json", "utf8"));
    const progress = progressFromApi([campaign]);
    assert.deepEqual(progress, progressFromReport([{ ...campaign, highestUnlockedBattle: 39 }]));
    const candidates = Object.entries(battles).filter(([, b]: [string, any]) => b.campaign === "Indomitus Mirror Elite");
    assert.ok(candidates.length > 0);
    const [id, battle] = candidates.find(([, b]: [string, any]) => b.nodeNumber === 39)! as [string, any];
    const reward = (battle.rewards.guaranteed ?? []).find((r: any) => r.id) ?? battle.rewards.potential.find((r: any) => r.id && r.effective_rate > 0);
    assert.ok(farmNodesFor(reward.id, battles, progress).find(n => n.id === id)?.unlocked);
    assert.equal(farmNodesFor(reward.id, battles, {}).find(n => n.id === id)?.unlocked, false);

});

test("every published numeric campaign target carries auditable evidence", () =>
{

    const targets = JSON.parse(readFileSync("config/campaign_elite_targets.json", "utf8"));
    const sources = JSON.parse(readFileSync("config/campaign_elite_sources.json", "utf8")).sources;
    for (const [campaignName, campaign] of Object.entries(targets.campaigns) as Array<[string, any]>)
        for (const [characterName, target] of Object.entries(campaign.characters) as Array<[string, any]>)
        {

            const hasNumericRecommendation = Boolean(target.rank || target.active || target.passive);
            if (!hasNumericRecommendation) continue;
            assert.ok(target.evidence?.length, `${campaignName} / ${characterName} has a target without evidence`);
            for (const sourceId of target.evidence)
            {

                assert.ok(sources[sourceId], `${campaignName} / ${characterName} references missing source ${sourceId}`);
                assert.match(sources[sourceId].url, /^https:\/\//);

            }

        }

});

test("campaign target gaps are deterministic and never recommend downgrades", () =>
{

    assert.equal(campaignRankGap(9, "Gold I"), 3);
    assert.equal(campaignRankGap(14, "Gold I"), 0);
    assert.equal(campaignRankGap(9, "Not a rank"), null);
    assert.equal(campaignRankGap(null, "Gold I"), null);
    assert.equal(abilityGap(17, "35+"), 18);
    assert.equal(abilityGap(44, "35+"), 0);
    assert.equal(abilityGap(17, undefined), null);

});

test("campaign recommendations prioritize carries and suppress completed rank goals", () =>
{

    const carry = campaignRecommendationPriority({ campaign: "Test", characterId: "carry", characterName: "Carry", currentRank: 9, targetRank: "Gold I", role: "primary carry", confidence: "high", accountPriority: 90 });
    const passenger = campaignRecommendationPriority({ campaign: "Test", characterId: "passenger", characterName: "Passenger", currentRank: 9, targetRank: "Gold I", role: "survival", confidence: "medium", accountPriority: 20 });
    assert.ok(carry.recommendationPriority > passenger.recommendationPriority);
    assert.equal(carry.rankStepsRemaining, 3);
    assert.equal(campaignRecommendationPriority({ campaign: "Test", characterId: "done", characterName: "Done", currentRank: 12, targetRank: "Gold I" }).recommendationPriority, 0);
    assert.equal(campaignRecommendationPriority({ campaign: "Test", characterId: "unknown", characterName: "Unknown", currentRank: null, targetRank: "Gold I" }).recommendationPriority, 0);

});

test("completed campaigns suppress all campaign-driven character upgrades", () =>
{

    const recommendation = campaignRecommendationPriority({ campaign: "Saim-Hann Mirror", campaignComplete: true, characterId: "abraxas", characterName: "Abraxas", currentRank: 12, targetRank: "Gold III", role: "primary summon carry", confidence: "high", accountPriority: 100 });
    assert.equal(recommendation.recommendationPriority, 0);
    assert.equal(recommendation.rankStepsRemaining, 0);
    assert.equal(recommendation.targetRankIndex, 12);
    assert.match(recommendation.reason, /already complete/i);

});
