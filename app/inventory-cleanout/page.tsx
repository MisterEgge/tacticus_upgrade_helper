import Nav from "../components/Nav";
import { getReport } from "../lib/report";
import { getCharacterCatalog } from "../lib/catalog";
import { inventoryCleanout } from "../../src/domain/inventoryCleanout";

export default async function InventoryCleanout()
{

    const [report, catalog] = await Promise.all([getReport(), getCharacterCatalog()]);
    if (!report) return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
    const catalogIds = new Set(catalog.characters.map(character => character.id));
    const completeCharacterCatalog = report.roster.every(unit => catalogIds.has(unit.id));
    const rows = inventoryCleanout(report.unequippedInventory, report.roster, [...report.equipmentAllocation.equipNow, ...report.equipmentAllocation.buyWatch], completeCharacterCatalog);
    const safe = rows.filter(row => row.scrap > 0 && row.status !== "UNKNOWN — DO NOT SCRAP");
    const unknown = rows.filter(row => row.status === "UNKNOWN — DO NOT SCRAP");
    return <main><Nav/><header><div><p className="eyebrow">INVENTORY</p><h1>Inventory Cleanout</h1><p className="sub">Conservative salvage audit. Items are only marked scrap-safe when the current account proves every verified same-family recipient already meets or exceeds that rarity. Unknown compatibility is never treated as scrap-safe.</p></div><div className="power">{safe.reduce((sum,row)=>sum+row.scrap,0)}<strong> copies identified</strong></div></header>
        <section className="cards compact"><div className="card"><strong>{safe.length}</strong><span>Items with excess copies</span></div><div className="card"><strong>{unknown.length}</strong><span>Compatibility unresolved</span><small>Do not scrap these yet</small></div></section>
        <section className="panel tablePanel"><div className="tableWrap"><table><thead><tr><th>Item</th><th>Owned</th><th>Keep</th><th>Scrap</th><th>Status / reason</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.name??row.id}</strong><small>{row.id}</small></td><td>{row.amount}</td><td>{row.keep}</td><td><strong>{row.scrap||"—"}</strong></td><td><strong>{row.status}</strong><small>{row.reason}</small></td></tr>)}</tbody></table></div></section>
        <p className="sub">The recipient pool comes from the synced game-wide character equipment types. If any compatible character is still locked, or an equipped slot cannot be proven, the item remains UNKNOWN rather than being suggested for salvage.</p>
    </main>;

}
