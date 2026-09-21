import Nav from "../components/Nav";
import FarmingTable from "./FarmingTable";
import { loadFarmingData, bestFarmNode, planMaterials, progressFromReport, RANK_NAMES } from "../lib/farming";
import { getReport } from "../lib/report";
import { readFile } from "node:fs/promises";

type Query = { character?: string; target?: string };
export default async function Farming({ searchParams }: { searchParams: Promise<Query> })
{

    const [data, report, query] = await Promise.all([loadFarmingData(), getReport(), searchParams]);
    if (!data || !report) return <main><Nav/><header><h1>Personal Farming Queue</h1></header><div className="empty">Account or farming data unavailable. Run <code>npm run sync:game-data</code> and <code>npm run refresh</code>.</div></main>;
    const priorities = JSON.parse(await readFile("config/character_priorities.json", "utf8")) as Record<string, { priority: number }>;
    const progress = progressFromReport(report.campaignProgress ?? []);
    const selected = query.character ? report.roster.find(u => u.id === query.character) : undefined;
    const requestedRank = query.target === undefined || query.target === "" ? undefined : Number(query.target);
    let error: string | undefined;
    let demand: ReturnType<typeof planMaterials> = new Map();
    try
    {

        if (report.upgradeInventory === undefined) throw new Error("Upgrade inventory unavailable. Refresh account data before calculating shortages.");
        if (query.character && !selected) throw new Error("Selected character is not in this account roster.");
        if (requestedRank !== undefined && (!selected || !Number.isInteger(requestedRank) || requestedRank <= selected.rank || requestedRank >= RANK_NAMES.length))
            throw new Error("Choose a target rank above the selected character’s current rank.");
        const units = selected ? [selected] : report.roster.filter(u => u.rank < RANK_NAMES.length - 1);
        demand = planMaterials(units.map(u => ({ id: u.id, name: u.name, currentRank: u.rank, targetRank: selected && requestedRank !== undefined ? requestedRank : u.rank + 1, ...(u.upgrades === undefined ? {} : { upgrades: u.upgrades }), priority: priorities[u.name]?.priority ?? 0 })), data.rankData, data.recipes, report.upgradeInventory);

    }
    catch (cause)
    {

        error = cause instanceof Error ? cause.message : "Material requirements unavailable.";

    }
    const rows = [...demand].map(([id, d]) =>
    {

        const recipe = data.recipes[id];
        const node = bestFarmNode(id, data.battles, progress);
        return { id, name: recipe?.material ?? id, rarity: recipe?.rarity ?? "", owned: d.owned, needed: d.needed, shortage: d.shortage, topCharacter: d.characters[0]?.name ?? "", topPriority: d.characters[0]?.priority ?? 0, node: node?.id ?? "", campaign: node?.campaign ?? "", campaignType: node?.campaignType ?? "", nodeNumber: node?.nodeNumber ?? 0, energy: node?.energyCost ?? 0, rate: node?.rate ?? 0 };

    }).filter(x => x.shortage > 0).sort((a, b) => b.topPriority - a.topPriority || b.shortage - a.shortage);
    return <main><Nav/><header><div><p className="eyebrow">FARMING</p><h1>Personal Farming Queue</h1>
        <p className="sub">Plan a character across multiple ranks, or the roster’s next ranks. Equipped upgrades and owned crafted materials are deducted before base-material shortages.</p>
        <p className="sub">Account report: {report.generatedAt}. Unlocked sources are accessible battles; raid eligibility and three-star completion are unknown.</p>
    </div><div className="power">{error ? "Unknown" : rows.length}<strong> shortages</strong></div></header>
        <form className="goalForm panel" action="/farming">
            <label>Character<select name="character" defaultValue={query.character ?? ""}><option value="">All characters — next rank</option>{report.roster.map(u => <option key={u.id} value={u.id}>{u.name} ({RANK_NAMES[u.rank] ?? "Unknown rank"})</option>)}</select></label>
            <label>Target rank<select name="target" defaultValue={query.target ?? ""}><option value="">Next rank</option>{RANK_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
            <button type="submit">Calculate materials</button>
        </form>
        {error ? <div className="empty" role="alert">{error}</div> : rows.length ? <section className="panel tablePanel"><FarmingTable rows={rows}/></section> : <div className="empty">No material shortages for this plan.</div>}
    </main>;

}
