"use client";
import { useEffect, useMemo, useState } from "react";
import { CURRENCIES, DAYS, currencyName, itemCategory, nextUtcReset, offerEligibility, recordState, refreshesLoggedToday, scheduledOn, scheduleLabel, sourceMatch, validateRecord, type ShopCatalog, type ShopRecord } from "../../src/domain/shops";

function friendlyName(id: string, labels: Record<string, string>): string
{

    if (labels[id]) return labels[id];
    const pool = /^items(Common|Uncommon|Rare|Epic|Legendary|Mythic)_I_(.+)$/.exec(id);
    if (pool) return `${pool[1]} ${pool[2]!.replaceAll("_", " ")} equipment pool`;
    if (id.startsWith("itemAscensionResource_")) return `${id.split("_")[1]} forge badges`;
    if (id.startsWith("xp")) return `${id.slice(2)} XP books`;
    return CURRENCIES[id] ?? id;

}
function localInput(ms: number): string
{

    const d = new Date(ms);
    return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

}

export default function ShopBrowser({ catalog, labels, initialItem, powerLevel, accountKey }: { catalog: ShopCatalog; labels: Record<string, string>; initialItem: string; powerLevel: number | null; accountKey: string })
{

    const [day, setDay] = useState<string>(DAYS[new Date(catalog.reviewedAt).getUTCDay()]!);
    const [shopId, setShopId] = useState("all");
    const [query, setQuery] = useState("");
    const [item, setItem] = useState(initialItem);
    const [category, setCategory] = useState("all");
    const [scheduledOnly, setScheduledOnly] = useState(false);
    const [records, setRecords] = useState<ShopRecord[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [now, setNow] = useState(0);
    const [message, setMessage] = useState("");
    const [recordShop, setRecordShop] = useState(catalog.shops[0]!.id);
    const [recordItem, setRecordItem] = useState(initialItem);
    const [quantity, setQuantity] = useState("1");
    const [cost, setCost] = useState("");
    const [currency, setCurrency] = useState("guildCredits");
    const [expiry, setExpiry] = useState("");
    const [status, setStatus] = useState<ShopRecord["status"]>("available");
    const [method, setMethod] = useState<ShopRecord["method"]>("ad");
    const storageKey = `tacticus.shop-observations.v1:${accountKey}`;
    useEffect(() =>
    {

        const time = Date.now();
        setNow(time); setDay(DAYS[new Date(time).getUTCDay()]!);
        setExpiry(localInput(nextUtcReset(time)));
        try
        {

            const saved = localStorage.getItem(storageKey);
            if (saved)
            {

                const parsed = JSON.parse(saved);
                if (parsed.version !== 1 || !Array.isArray(parsed.records) || !parsed.records.every((r: unknown) => validateRecord(r, catalog))) throw new Error("Saved shop history is invalid. Export or clear it in browser settings before replacing it.");
                setRecords(parsed.records);

            }
            setLoaded(true);

        }
        catch (error) { setMessage(error instanceof Error ? error.message : "Could not read shop history."); }
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);

    }, [storageKey, catalog]);
    const rows = useMemo(() => catalog.shops.flatMap(shop => shop.offers.map(offer => ({ shop, offer }))).filter(({ shop, offer }) =>
    {

        return (shopId === "all" || shop.id === shopId)
            && (!item || sourceMatch(item, offer, catalog.equipment))
            && (category === "all" || itemCategory(offer.itemId) === category)
            && (!scheduledOnly || scheduledOn(offer.schedule, day) === true)
            && (!query || `${friendlyName(offer.itemId, labels)} ${offer.itemId} ${shop.name}`.toLowerCase().includes(query.toLowerCase()));

    }), [catalog, day, shopId, item, category, scheduledOnly, query, labels]);
    function save(next: ShopRecord[])
    {

        try
        {

            localStorage.setItem(storageKey, JSON.stringify({ version: 1, records: next }));
            setRecords(next); setMessage("Saved in this browser. Official inventory remains unchanged.");

        }
        catch { setMessage("Could not save shop history. Browser storage may be full or disabled."); }

    }
    function log(kind: ShopRecord["kind"])
    {

        const time = Date.now();
        const record: ShopRecord = { id: crypto.randomUUID(), shopId: recordShop, recordedAt: time, kind, itemId: kind === "stock" ? recordItem.trim() : "", quantity: kind === "stock" ? Number(quantity) : 0, cost: kind === "stock" && cost !== "" ? Number(cost) : null, currency, expiresAt: kind === "stock" ? new Date(expiry).getTime() : nextUtcReset(time), status, method };
        if (!validateRecord(record, catalog) || record.expiresAt <= time || (kind === "stock" && status === "available" && record.quantity < 1)) { setMessage("Enter an item ID, valid quantity/cost, and a future expiration."); return; }
        if (kind === "refresh" && method === "ad" && catalog.shops.find(s => s.id === recordShop)?.adRefresh === false) { setMessage("This catalog lists no ad refresh for that shop. Choose the refresh method used."); return; }
        save([...records, record]); setNow(time);

    }
    function exportHistory()
    {

        const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, records }, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "tacticus-shop-history.json"; link.click(); URL.revokeObjectURL(url);

    }
    return <>
        <section className="shopCards" aria-label="Shop refresh rules">{catalog.shops.map(shop => <article className="panel shopCard" key={shop.id}>
            <h2>{shop.name}</h2><p className="eyebrow">{shop.coverage === "catalog" ? "COMMUNITY CATALOG" : "RESEARCHING"}</p>
            <dl><dt>Ad refresh</dt><dd>{shop.adRefresh === null ? "Unknown" : shop.adRefresh ? "Yes" : "No"}</dd>
                <dt>Paid refresh</dt><dd>{shop.refreshCost ? `${shop.refreshCost.amount} ${currencyName(shop.refreshCost.currency)}` : "Unknown"}</dd>
                <dt>Extra refresh limit</dt><dd>{shop.refreshLimit === null ? "Unknown" : `${shop.refreshLimit} / day (catalog)`}</dd>
                <dt>Manually logged today</dt><dd>{loaded ? refreshesLoggedToday(records, shop.id, now) : "—"}. Actual remaining: unknown.</dd>
            </dl><p className="sub">{shop.notes}</p>{shop.sourceUrl ? <a href={shop.sourceUrl} target="_blank" rel="noreferrer">Source / verify rules</a> : <small>No verified rules source yet.</small>}
        </article>)}</section>
        <section className="panel shopSection"><h2>Find an acquisition source</h2>
            <div className="shopControls">
                <label>Shop<select value={shopId} onChange={e => setShopId(e.target.value)}><option value="all">All shops</option>{catalog.shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label>Rotation day (UTC)<select value={day} onChange={e => setDay(e.target.value)}>{DAYS.map(d => <option key={d}>{d}</option>)}</select></label>
                <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">All offers</option><option value="upgrade">Upgrade materials</option><option value="equipment">Equipment / forge materials</option><option value="other">Other resources</option></select></label>
                <label>Search<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Item name, ID, or shop"/></label>
                <label>Exact item / compatible pool<input list="itemNames" value={item} onChange={e => setItem(e.target.value)} placeholder="Stable item ID"/></label>
                <label className="checkLabel"><input type="checkbox" checked={scheduledOnly} onChange={e => setScheduledOnly(e.target.checked)}/> Only scheduled on selected day</label>
            </div>
            <datalist id="itemNames">{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</datalist>
            {item ? <p>Sources for <strong>{friendlyName(item, labels)}</strong> <button type="button" onClick={() => setItem("")}>Clear item</button></p> : null}
            <p className="sub">{rows.length} offer variants. Rows in the same shop slot are alternatives. Unknown event/roster locks stay unknown; prices and purchase limits are catalog values. Shop-wide access is not confirmed.</p>
            <div className="tableWrap"><table><thead><tr><th>Item / quantity</th><th>Shop / slot</th><th>Cost</th><th>Rotation</th><th>Eligibility / stock</th><th>Track</th></tr></thead><tbody>{rows.map(({ shop, offer }) => <tr key={offer.id}>
                <td><strong>{friendlyName(offer.itemId, labels)} × {offer.quantity}</strong><small>{offer.itemId}</small>{offer.itemId.startsWith("items") ? <small>Random equipment pool — exact item not guaranteed</small> : null}</td>
                <td>{shop.name}<small>Slot {offer.slot} · alternative offer</small></td>
                <td>{offer.cost.amount} {currencyName(offer.cost.currency)}<small>Purchase limit: {offer.maxPurchases ?? "not specified"}</small></td>
                <td>{scheduleLabel(offer.schedule)}<small>{scheduledOn(offer.schedule, day) === null ? "Schedule unknown" : scheduledOn(offer.schedule, day) ? "Scheduled candidate" : "Other day"}</small></td>
                <td>{offerEligibility(offer, powerLevel) === "locked" ? "Power-level locked" : offerEligibility(offer, powerLevel) === "unknown" ? "Requirements unknown" : "Power requirements met"}<small>Current stock: unconfirmed</small>{offer.conditions.minPowerLevel !== undefined ? <small>Min PL {offer.conditions.minPowerLevel}</small> : null}{offer.conditions.maxPowerLevel !== undefined ? <small>Max PL {offer.conditions.maxPowerLevel}</small> : null}{offer.conditions.lockId ? <details><summary>Additional condition</summary><small>{offer.conditions.lockId}</small></details> : null}</td>
                <td><a href="#shop-log" onClick={() => { setRecordShop(shop.id); setRecordItem(offer.itemId.startsWith("items") ? "" : offer.itemId); setQuantity(String(offer.quantity)); setCost(String(offer.cost.amount)); setCurrency(offer.cost.currency); setExpiry(localInput(nextUtcReset(Date.now()))); }}>Record observed offer</a></td>
            </tr>)}</tbody></table></div>
            {!rows.length ? <p className="empty">No verified catalog match for these filters. This does not prove the item is never sold. Check Main shop / Daily Deals and active event offers; their catalogs remain under research.</p> : null}
        </section>
        <section className="panel shopSection" id="shop-log"><h2>Observed stock &amp; refresh history</h2>
            <p className="sub">Manual observations for {accountKey === "unassigned" ? "this browser (no account loaded)" : accountKey}. Saved only in this browser; export a backup or import it on another device. Logging a refresh invalidates earlier stock observations for that shop. Purchases do not alter official inventory.</p>
            <div className="shopControls">
                <label>Shop observed<select value={recordShop} onChange={e => { setRecordShop(e.target.value); setExpiry(""); setCost(""); setCurrency(""); }}>{catalog.shops.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
                <label>Item ID<input list="itemNames" value={recordItem} onChange={e => setRecordItem(e.target.value)}/></label>
                <label>Quantity<input type="number" min="0" step="1" value={quantity} onChange={e => setQuantity(e.target.value)}/></label>
                <label>Observed price (optional)<input type="number" min="0" value={cost} onChange={e => setCost(e.target.value)}/></label>
                <label>Currency<input list="currencies" value={currency} onChange={e => setCurrency(e.target.value)}/></label>
                <label>Expires / recheck by (your local time)<input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)}/></label>
                <label>Observation<select value={status} onChange={e => setStatus(e.target.value as ShopRecord["status"])}><option value="available">Seen available</option><option value="sold-out">Sold out</option><option value="purchased">Purchased</option></select></label>
            </div><datalist id="currencies">{Object.entries(CURRENCIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</datalist>
            <p className="sub">Verify the prefilled catalog price and reset time against the game. For a random equipment pool, record the actual item offered.</p>
            <div className="shopControls"><button type="button" disabled={!loaded} onClick={() => log("stock")}>Save observation</button>
                <label>Refresh performed<select value={method} onChange={e => setMethod(e.target.value as ShopRecord["method"])}><option value="ad">Watched ad</option><option value="paid">Paid refresh</option><option value="automatic">Automatic reset</option></select></label>
                <button type="button" disabled={!loaded} onClick={() => log("refresh")}>Log completed refresh</button><button type="button" disabled={!loaded} onClick={exportHistory}>Export history</button>
                <label>Import history<input type="file" accept="application/json,.json" disabled={!loaded} onChange={async e =>
                {

                    const file = e.target.files?.[0]; if (!file) return;
                    try
                    {

                        if (file.size > 2000000) throw new Error("History file is too large.");
                        const parsed = JSON.parse(await file.text());
                        if (parsed.version !== 1 || !Array.isArray(parsed.records) || parsed.records.length > 5000 || !parsed.records.every((r: unknown) => validateRecord(r, catalog))) throw new Error("Invalid shop history file.");
                        const merged = new Map(records.map(r => [r.id, r]));
                        for (const record of parsed.records as ShopRecord[]) if (!merged.has(record.id)) merged.set(record.id, record);
                        save([...merged.values()]);

                    }
                    catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
                    e.target.value = "";

                }}/></label>
            </div><p role="status">{message}</p>
            <div className="tableWrap"><table><thead><tr><th>When</th><th>Shop</th><th>Observed item / action</th><th>Price</th><th>Status</th><th>Recheck by</th></tr></thead><tbody>{[...records].sort((a, b) => b.recordedAt - a.recordedAt).map(r => <tr key={r.id}><td>{new Date(r.recordedAt).toLocaleString()}</td><td>{catalog.shops.find(s => s.id === r.shopId)?.name}</td><td>{r.kind === "refresh" ? `${r.method} refresh` : `${friendlyName(r.itemId, labels)} × ${r.quantity}`}</td><td>{r.cost === null ? "Not recorded" : `${r.cost} ${currencyName(r.currency)}`}</td><td>{recordState(r, records, now)}</td><td>{new Date(r.expiresAt).toLocaleString()}</td></tr>)}</tbody></table></div>
            {loaded && !records.length ? <p>No observations yet. Unrecorded stock and refresh usage are unknown.</p> : null}
        </section>
    </>;

}
