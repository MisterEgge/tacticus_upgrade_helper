import Nav from "../components/Nav";
import ShopBrowser from "./ShopBrowser";
import { getShopCatalog } from "../lib/shops";
import Link from "next/link";
import { farmNodesFor, progressFromReport, loadFarmingData } from "../lib/farming";
import { getReport } from "../lib/report";
import { getCharacterCatalog } from "../lib/catalog";

export default async function Sources({ searchParams }: { searchParams: Promise<{ item?: string }> })
{

    const [catalog, data, report, characters, query] = await Promise.all([getShopCatalog(), loadFarmingData(), getReport(), getCharacterCatalog(), searchParams]);
    if (!catalog) return <main><Nav/><h1>Shops &amp; Sources</h1><div className="empty">Shop catalog unavailable. Run <code>npm run sync:shops</code>.</div></main>;
    const labels = Object.fromEntries(Object.entries(data?.recipes ?? {}).map(([id, recipe]) => [id, recipe.material]));
    for (const [id, item] of Object.entries(catalog.equipment)) labels[id] = `${item.name} (${item.rarity})`;
    for (const character of characters.characters)
    {

        labels[`shards_${character.id}`] = `${character.name} shards`;
        labels[`mythicShards_${character.id}`] = `${character.name} mythic shards`;

    }
    const recipe = query.item ? data?.recipes[query.item] : undefined;
    const nodes = query.item && data ? farmNodesFor(query.item, data.battles, progressFromReport(report?.campaignProgress ?? [])) : [];
    return <main><Nav/><header><div><p className="eyebrow">ACQUISITION</p><h1>Shops &amp; Sources</h1>
        <p className="sub">Shop catalogs, weekday rotations, prices and refresh rules. Scheduled offers are possibilities; actual stock must be checked in-game.</p>
        <p className="sub">Community data reviewed {catalog.reviewedAt.slice(0, 10)}. Account power level: {report?.source.powerLevel ?? "unknown"}. Shop access and live offers are unknown in the player API.</p>
    </div></header>
        {query.item ? <section className="panel shopSection"><h2>{labels[query.item] ?? query.item}: other acquisition routes</h2>
            {recipe?.craftable ? <p>Crafting recipe: {recipe.recipe?.map((part, i) => <span key={part.material}>{i ? " + " : ""}<Link className="sourceLink" href={`/sources?item=${encodeURIComponent(part.material)}`}>{part.count} × {labels[part.material] ?? part.material}</Link></span>) ?? "Unavailable"}. Owned materials are deducted by the Farming planner.</p> : recipe ? <p>No crafting recipe in the synced material catalog.</p> : <p>Equipment forging and random reward/chest pools are not yet fully cataloged. No exact drop or forge cost is assumed.</p>}
            {nodes.length ? <details><summary>All {nodes.length} campaign sources</summary><div className="tableWrap"><table><thead><tr><th>Node</th><th>Campaign</th><th>Energy</th><th>Expected yield / battle</th><th>Access</th></tr></thead><tbody>{nodes.map(n => <tr key={n.id}><td>{n.id}</td><td>{n.campaign}</td><td>{n.energyCost}</td><td>{n.rate.toFixed(3)}</td><td>{!report?.campaignProgress ? "Unknown" : n.unlocked ? "Recorded unlocked" : "No recorded unlock"}</td></tr>)}</tbody></table></div><p>Unlock does not establish completion or raid eligibility.</p></details> : null}
        </section> : null}
        <ShopBrowser key={`${report?.source.player ?? "unassigned"}:${query.item ?? ""}`} catalog={catalog} labels={labels} initialItem={query.item ?? ""} powerLevel={report?.source.powerLevel ?? null} accountKey={report?.source.player ?? "unassigned"}/></main>;

}
