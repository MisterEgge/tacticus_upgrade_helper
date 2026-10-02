import Link from "next/link";
import Nav from "../components/Nav";
import ReferenceDetails from "../components/ReferenceDetails";
import { getCharacterCatalog } from "../lib/catalog";
import { loadFarmingData, RANK_NAMES } from "../lib/farming";
import { getReport } from "../lib/report";
import { materialCompletion, type MaterialCompletionRow } from "../../src/domain/materialCompletion";
import MaterialTable from "./MaterialTable";
import { readFile } from "node:fs/promises";

export default async function MaterialCompletion({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
    const [data, report, catalog, query] = await Promise.all([loadFarmingData(), getReport(), getCharacterCatalog(), searchParams]);
    const target = query.target === undefined ? RANK_NAMES.length - 1 : Number(query.target);
    const source = await readFile("data/game/source.json", "utf8").then(text => JSON.parse(text) as { syncedAt?: string }).catch(() => null);
    let rows: MaterialCompletionRow[] = [], error: string | undefined;
    try {
        if (!data || !report) throw new Error("Account or farming data unavailable. Run npm run sync:game-data and npm run refresh.");
        rows = materialCompletion({ catalog: catalog.characters, roster: report.roster, ranks: data.rankData, recipes: data.recipes, inventory: report.upgradeInventory, targetRank: target });
    } catch (cause) {
        error = cause instanceof Error ? cause.message : "Material completion unavailable.";
    }
    const done = rows.filter(row => row.status.startsWith("done")).length;
    return <main><Nav/><header><div><p className="eyebrow">LIFETIME MATERIALS</p><h1>Material Completion</h1>
        <p className="sub">See which materials your owned characters have finished using, and which you already have enough of.</p>
        <p className="sub">Scope: current character catalog through {RANK_NAMES[target] ?? "unknown rank"}. New characters and future upgrades can add demand.</p>
        <ReferenceDetails label="How completion is calculated">
            <p>{catalog.characters.length} catalog characters. Recipe data last synced: {source?.syncedAt ?? "Unknown"}. Sync game data to include newly added characters and recipes.</p>
            <p>Remaining uses include every unequipped upgrade before the selected ceiling, expanded recursively through all crafting ingredients. Rarity and XP gates do not remove future rank costs.</p>
            <p>Inventory is shared once across owned characters. Finished and intermediate upgrades are used before expanding missing ingredients. Stocked means enough inventory; Done means no remaining use.</p>
            <p>Unowned demand assumes each unowned character starts at Stone I. Unallocated copies may still be needed by those characters. Unknown recipes or account progress block completion claims. Machines of War, units outside the synced character catalog, and other material sinks are outside this calculation.</p>
            <p>The ceiling is a rank to reach; upgrades equipped at that rank for the next rank are excluded. This page never labels materials permanently finished or recommends salvage.</p>
            <Link className="sourceLink" href="/farming">Plan shorter farming goals</Link>
        </ReferenceDetails>
    </div><div className="power">{error ? "Unknown" : done}<strong> done for owned roster</strong></div></header>
        <form className="goalForm panel" action="/material-completion"><label>Calculate through rank<select name="target" defaultValue={String(target)}>
            {RANK_NAMES.map((name, index) => index > 0 ? <option key={name} value={index}>{name}</option> : null)}
        </select></label><button type="submit">Calculate completion</button></form>
        {error ? <div className="empty" role="alert">{error}</div> : <>
            <section className="cards compact">
                <div className="card"><strong>{done}</strong><span>No remaining owned uses</span></div>
                <div className="card"><strong>{rows.filter(row => row.status === "stocked").length}</strong><span>Inventory covers remaining uses</span></div>
                <div className="card"><strong>{rows.filter(row => row.status === "farming").length}</strong><span>Still to collect or craft</span></div>
            </section>
            <section className="panel tablePanel"><MaterialTable rows={rows}/></section>
        </>}
    </main>;
}
