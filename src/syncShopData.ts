import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import type { Shop, ShopCatalog, ShopOffer } from "./domain/shops";

const commit = process.argv[2] ?? "1dbeaa4a04519599be9201d1f2521bdb74c45ae4";
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Supply a full upstream commit SHA.");
const checkout = process.argv[3];
if (checkout && execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== commit) throw new Error("Checkout does not match source commit.");
const root = "src/fsd/4-entities/shops/data/";
const files = [
    ["guild", "Guild Shop", "new-guild-shop.json"],
    ["war", "War Shop", "new-war-shop.json"],
    ["crusade", "Crusade Shop", "new-crusade-shop-data.json"],
    ["rogue", "Rogue Trader", "new-rogue-trader.json"]
] as const;
async function readSource(file: string)
{

    if (checkout) return JSON.parse(await readFile(path.join(checkout, file), "utf8"));
    const response = await fetch(`https://raw.githubusercontent.com/svehera/tacticusplanner/${commit}/${file}`);
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.json();

}
const shops: Shop[] = [];
for (const [id, name, file] of files)
{

    const raw = await readSource(root + file);
    if (!Array.isArray(raw.products) || typeof raw.refreshWithAdWatch !== "boolean" || !Number.isInteger(raw.allowedRefreshesPerDay)) throw new Error(`Invalid shop schema: ${file}`);
    const offers: ShopOffer[] = raw.products.flatMap((slot: any[], i: number) => slot.map((offer, j) =>
    {

        const [itemId, count] = offer.reward.split(":");
        const quantity = count === undefined ? 1 : Number(count);
        if (!itemId || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(offer.cost?.amount) || typeof offer.cronSchedule !== "string") throw new Error(`Invalid offer: ${file} ${i}/${j}`);
        return { id: `${id}:${i + 1}:${j + 1}`, slot: i + 1, itemId, quantity, schedule: offer.cronSchedule, cost: { currency: offer.cost.type, amount: offer.cost.amount }, maxPurchases: offer.maxPurchases === undefined ? null : Number(offer.maxPurchases), conditions: offer.conditions ?? {}, weight: offer.weight ?? null };

    }));
    shops.push({ id, name, coverage: "catalog", sourceUrl: `https://github.com/svehera/tacticusplanner/blob/${commit}/${root}${file}`, notes: "Community catalog snapshot. Item schedules use UTC. Shop access, event locks, actual stock and remaining refreshes are not supplied by the player API.", adRefresh: raw.refreshWithAdWatch, refreshLimit: raw.allowedRefreshesPerDay, refreshCost: raw.refreshCost ? { currency: raw.refreshCost.resourceType, amount: raw.refreshCost.amount } : null, offers });

}
for (const [id, name, url, notes] of [
    ["daily", "Main shop / Daily Deals", "", "Exact stock pool, prices, ad limits and reset timing still need verified source data. Record offers seen in-game here; do not assume every material is sold."],
    ["events", "Limited-time / event shops", "", "Offers and currencies depend on the active event. Old event inventories must not be presented as current. Record the offer and its in-game expiration."],
    ["web", "Official web store", "https://hub.tacticusgame.com/store", "Official storefront verified. Exact equipment/material bundles, account eligibility and expiry require checking the current offer. No fixed item catalog inferred."]
]) shops.push({ id: id!, name: name!, sourceUrl: url!, notes: notes!, coverage: "researching", adRefresh: null, refreshLimit: null, refreshCost: null, offers: [] });
const equipmentRaw = await readSource("src/fsd/4-entities/equipment/data/new-equipment-data.json");
const equipment = Object.fromEntries(Object.entries(equipmentRaw).map(([id, item]: [string, any]) => [id, { name: item.name, rarity: item.rarity, type: item.type }]));
const catalog: ShopCatalog = { schemaVersion: 1, reviewedAt: new Date().toISOString(), sourceCommit: commit, sourceKind: "community", shops, equipment };
await mkdir("data/game", { recursive: true });
await writeFile("data/game/shops.json.tmp", JSON.stringify(catalog, null, 2) + "\n");
await rename("data/game/shops.json.tmp", "data/game/shops.json");
console.log(`Synced ${shops.filter(s => s.coverage === "catalog").length} shop catalogs and ${shops.reduce((n, s) => n + s.offers.length, 0)} offer variants from ${commit}.`);
