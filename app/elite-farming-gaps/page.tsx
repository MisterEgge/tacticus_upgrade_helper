import Link from "next/link";
import Nav from "../components/Nav";
import ReferenceDetails from "../components/ReferenceDetails";
import { getCharacterCatalog } from "../lib/catalog";
import { loadFarmingData, progressFromReport, RANK_NAMES } from "../lib/farming";
import { getReport } from "../lib/report";
import { materialCompletion, type MaterialCompletionRow } from "../../src/domain/materialCompletion";
import { eliteFarmingGaps, eliteUnlockOpportunities, filterEliteGaps } from "../../src/domain/eliteFarmingGaps";
import GapTable from "./GapTable";
import CampaignUnlocks from "./CampaignUnlocks";

type Query = { target?: string; mythic?: string; needed?: string };
export default async function EliteFarmingGaps({ searchParams }: { searchParams: Promise<Query> }) {
    const [data, report, catalog, query] = await Promise.all([loadFarmingData(), getReport(), getCharacterCatalog(), searchParams]);
    if (!data) return <main><Nav/><h1>Elite Farming Gaps</h1><div className="empty">Farming data unavailable. Run <code>npm run sync:game-data</code>.</div></main>;
    const target = query.target === undefined ? RANK_NAMES.length - 1 : Number(query.target);
    const includeMythic = query.mythic === "1", onlyNeeded = query.needed === "1";
    let completion: MaterialCompletionRow[] | undefined, demandError: string | undefined;
    try {
        if (!report) throw new Error("Account data unavailable. Refresh account data to calculate shortages and confirm campaign access.");
        completion = materialCompletion({ catalog: catalog.characters, roster: report.roster, ranks: data.rankData, recipes: data.recipes, inventory: report.upgradeInventory, targetRank: target });
    } catch (cause) {
        demandError = cause instanceof Error ? cause.message : "Material demand unavailable.";
    }
    const progress = progressFromReport(report?.campaignProgress ?? []);
    const allGaps = eliteFarmingGaps({ recipes: data.recipes, battles: data.battles, progress, ...(completion === undefined ? {} : { completion }) });
    const rows = filterEliteGaps(allGaps, { includeMythic, onlyNeeded });
    const opportunities = eliteUnlockOpportunities(rows, progress);
    return <main><Nav/><header><div><p className="eyebrow">FARMING ACCESS</p><h1>Elite Farming Gaps</h1>
        <p className="sub">Every farmable upgrade material without a confirmed unlocked Elite source. Mythic materials are hidden by default.</p>
        <p className="sub">Owned demand through {RANK_NAMES[target] ?? "unknown rank"}. The full gap list includes materials you do not currently need.</p>
        <ReferenceDetails label="Coverage and savings details">
            <p>Any confirmed unlocked Elite node removes a material from this list. Missing or invalid campaign progress stays unknown; zero is a recorded locked campaign. No Elite source means none exists in the synced battle dataset.</p>
            <p>Shortages come from Material Completion, including equipped slots and shared crafted inventory. Unknown demand stays visible when filtering for shortages. Recipe-only upgrades, shards, currency and materials without farmable campaign nodes are excluded.</p>
            <p>Savings compare expected energy per drop from your best unlocked alternative with the earliest locked Elite node in each campaign. They exclude the energy and character investment to clear the campaign, daily attempt limits and drop variance. If no unlocked alternative is known, no savings estimate is invented.</p>
            <p>Unlock progress does not establish three-star completion or raid eligibility. Unknown Elite coverage does not contribute to campaign recommendations. New content can change source coverage.</p>
            <Link className="sourceLink" href={`/material-completion?target=${target}`}>Review lifetime material demand</Link>
        </ReferenceDetails>
    </div><div className="power">{rows.length}<strong> material gaps</strong></div></header>
        <form className="goalForm panel" action="/elite-farming-gaps">
            <label>Calculate demand through<select name="target" defaultValue={String(target)}>{RANK_NAMES.map((name, index) => index > 0 ? <option key={name} value={index}>{name}</option> : null)}</select></label>
            <label className="checkLabel"><input type="checkbox" name="mythic" value="1" defaultChecked={includeMythic}/> Include Mythic materials</label>
            <label className="checkLabel"><input type="checkbox" name="needed" value="1" defaultChecked={onlyNeeded}/> Hide finished and stocked materials</label>
            <button type="submit">Update gaps</button>
        </form>
        {demandError && <div className="empty" role="alert">Demand unavailable: {demandError} Source coverage remains visible with unknown demand.</div>}
        <section className="cards compact"><div className="card"><strong>{rows.filter(row => row.coverage === "locked").length}</strong><span>Locked Elite sources</span></div><div className="card"><strong>{rows.filter(row => row.coverage === "no-elite").length}</strong><span>No Elite source in synced data</span></div><div className="card"><strong>{rows.filter(row => row.coverage === "unknown").length}</strong><span>Elite progress unknown</span></div></section>
        <CampaignUnlocks opportunities={opportunities}/>
        <section className="eliteGapMaterials"><h2>Materials without unlocked Elite sources</h2>
            {rows.length ? <div className="panel tablePanel"><GapTable rows={rows}/></div> : <div className="empty">No material gaps for these filters.</div>}
        </section>
    </main>;
}
