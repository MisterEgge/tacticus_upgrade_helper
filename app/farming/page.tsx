import Link from "next/link";
import { getShopCatalog } from "../lib/shops";
import { sourcesForItem } from "../../src/domain/shops";
import Nav from "../components/Nav";
import FarmingTable from "./FarmingTable";
import { loadFarmingData, bestFarmNode, planMaterials, progressFromReport, RANK_NAMES } from "../lib/farming";
import { getReport } from "../lib/report";
import { getCampaignTargets, getCharacterCatalog } from "../lib/catalog";
import { campaignIsComplete, campaignRankIndex, campaignRecommendationPriority, requiredCampaignName, type CampaignBattleDefinition } from "../../src/domain/campaigns";
import { readFile } from "node:fs/promises";
import { collapseCampaignGoals } from "../../src/domain/campaignGoals";

type Query = { character?: string; target?: string; plan?: string };
export default async function Farming({ searchParams }: { searchParams: Promise<Query> })
{

    const [data, report, query, catalog, campaignTargets, shops] = await Promise.all([loadFarmingData(), getReport(), searchParams, getCharacterCatalog(), getCampaignTargets(), getShopCatalog()]);
    if (!data || !report) return <main><Nav/><header><h1>Personal Farming Queue</h1></header><div className="empty">Account or farming data unavailable. Run <code>npm run sync:game-data</code> and <code>npm run refresh</code>.</div></main>;
    const [priorities, battleCatalog] = await Promise.all([
        readFile("config/character_priorities.json", "utf8").then(value => JSON.parse(value) as Record<string, { priority: number }>),
        readFile("data/game/campaign-battles.json", "utf8").then(value => Object.values(JSON.parse(value) as Record<string, CampaignBattleDefinition>))
    ]);
    const progress = progressFromReport(report.campaignProgress ?? []);
    const characterIds = new Set(catalog.characters.map(c => c.id));
    const rankRoster = report.roster.filter(u => characterIds.has(u.id));
    const excluded = report.roster.filter(u => !characterIds.has(u.id));
    const selected = query.character ? rankRoster.find(u => u.id === query.character) : undefined;
    const requestedRank = query.target === undefined || query.target === "" ? undefined : Number(query.target);
    let error: string | undefined;
    let demand: ReturnType<typeof planMaterials> = new Map();
    try
    {

        if (report.upgradeInventory === undefined) throw new Error("Upgrade inventory unavailable. Refresh account data before calculating shortages.");
        if (query.character && !selected) throw new Error("Selected unit is not in this account’s synced character rank catalog.");
        if (requestedRank !== undefined && (!selected || !Number.isInteger(requestedRank) || requestedRank <= selected.rank || requestedRank >= RANK_NAMES.length))
            throw new Error("Choose a target rank above the selected character’s current rank.");
        const campaignGoalCandidates = query.plan === "campaign" ? Object.entries(campaignTargets.campaigns).flatMap(([campaignName, campaign]) => { const campaignProgress = report.campaignProgress?.find(c => (c.type === "Elite" || c.type === "EliteMirror") && requiredCampaignName(c) === campaignName); const campaignComplete = campaignIsComplete(campaignProgress, battleCatalog); return catalog.characters.filter(character => character.campaignsRequiredIn.includes(campaignName)).flatMap(character => { const unit = rankRoster.find(u => u.id === character.id); const target = campaign.characters[character.name]; if (!unit || !target?.rank) return []; const recommendation = campaignRecommendationPriority({ campaign: campaignName, campaignComplete, characterId: character.id, characterName: character.name, currentRank: unit.rank, targetRank: target.rank, role: target.role, confidence: target.confidence, accountPriority: priorities[character.name]?.priority ?? 0 }); const targetRank = campaignRankIndex(target.rank); return recommendation.recommendationPriority > 0 && targetRank !== null ? [{ id: unit.id, name: unit.name, currentRank: unit.rank, targetRank, ...(unit.upgrades === undefined ? {} : { upgrades: unit.upgrades }), priority: recommendation.recommendationPriority, ...(target.confidence === undefined ? {} : { confidence: target.confidence }) }] : []; }); }) : [];
        const campaignGoals = collapseCampaignGoals(campaignGoalCandidates);
        const units = selected ? [selected] : rankRoster.filter(u => u.rank < RANK_NAMES.length - 1);
        const goals = query.plan === "campaign" ? campaignGoals : units.map(u => ({ id: u.id, name: u.name, currentRank: u.rank, targetRank: selected && requestedRank !== undefined ? requestedRank : u.rank + 1, ...(u.upgrades === undefined ? {} : { upgrades: u.upgrades }), priority: priorities[u.name]?.priority ?? 0 }));
        demand = planMaterials(goals, data.rankData, data.recipes, report.upgradeInventory);

    }
    catch (cause)
    {

        error = cause instanceof Error ? cause.message : "Material requirements unavailable.";

    }
    const rows = [...demand].map(([id, d]) =>
    {

        const recipe = data.recipes[id];
        const node = bestFarmNode(id, data.battles, progress);
        return { id, shops: shops ? sourcesForItem(id, shops) : [], name: recipe?.material ?? id, rarity: recipe?.rarity ?? "", owned: d.owned, needed: d.needed, shortage: d.shortage, topCharacter: d.characters[0]?.name ?? "", topPriority: d.characters[0]?.priority ?? 0, node: node?.id ?? "", campaign: node?.campaign ?? "", campaignType: node?.campaignType ?? "", nodeNumber: node?.nodeNumber ?? 0, energy: node?.energyCost ?? 0, rate: node?.rate ?? 0 };

    }).filter(x => x.shortage > 0).sort((a, b) => b.topPriority - a.topPriority || b.shortage - a.shortage);
    return <main><Nav/><header><div><p className="eyebrow">FARMING</p><h1>Personal Farming Queue</h1>
        <p className="sub">Plan a character across multiple ranks, or the roster’s next ranks. Equipped upgrades and owned crafted materials are deducted before base-material shortages.</p>
        <p className="sub"><Link className="sourceLink" href="/sources">Shop catalogs, rotations and refresh tracking</Link>. Per-material links include shop offers, recipes and all campaign sources.</p>
        <p className="sub">Account report: {report.generatedAt}. Unlocked sources are accessible battles; raid eligibility and three-star completion are unknown.</p>
    </div><div className="power">{error ? "Unknown" : rows.length}<strong> shortages</strong></div></header>
        {excluded.length ? <p className="sub">Excluded from character rank planning (outside synced character catalog): {excluded.map(u => u.name).join(", ")}. No rank costs are assumed for these units.</p> : null}
        <form className="goalForm panel" action="/farming">
            <label>Plan<select name="plan" defaultValue={query.plan ?? "next"}><option value="next">Roster next ranks</option><option value="campaign">Campaign recommendation gaps</option></select></label>
            <label>Character<select name="character" defaultValue={query.character ?? ""}><option value="">All characters — next rank</option>{rankRoster.map(u => <option key={u.id} value={u.id}>{u.name} ({RANK_NAMES[u.rank] ?? "Unknown rank"})</option>)}</select></label>
            <label>Target rank<select name="target" defaultValue={query.target ?? ""}><option value="">Next rank</option>{RANK_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
            <button type="submit">Calculate materials</button>
        </form>
        {error ? <div className="empty" role="alert">{error}</div> : rows.length ? <section className="panel tablePanel"><FarmingTable rows={rows}/></section> : <div className="empty">No material shortages for this plan.</div>}
    </main>;

}
