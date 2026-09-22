export const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type ShopOffer = {
    id: string; slot: number; itemId: string; quantity: number; schedule: string;
    cost: { currency: string; amount: number }; maxPurchases: number | null;
    conditions: { minPowerLevel?: number; maxPowerLevel?: number; lockId?: string };
    weight: number | null;
};
export type Shop = {
    id: string; name: string; coverage: "catalog" | "researching" | "archive";
    sourceUrl: string; notes: string;
    adRefresh: boolean | null; refreshLimit: number | null;
    refreshCost: { currency: string; amount: number } | null;
    offers: ShopOffer[];
};
export type ShopCatalog = {
    schemaVersion: 1; reviewedAt: string; sourceCommit: string; sourceKind: "community";
    shops: Shop[]; equipment: Record<string, { name: string; rarity: string; type: string }>;
};
export const CURRENCIES: Record<string, string> = {
    gems: "Blackstone", gold: "Coins", guildCredits: "Guild Credits", guildWarCurrency: "War Credits",
    crusadeCurrency: "Crusade Credits", elderShopCurrency: "Archeotech", dust: "Salvage", mythicDust: "Mythic salvage"
};
export function currencyName(id: string): string { return CURRENCIES[id] ?? id; }

export function scheduledOn(schedule: string, day: string): boolean | null
{

    if (!(DAYS as readonly string[]).includes(day)) return null;
    const match = /^0 0 0 \? \* (\*|(?:SUN|MON|TUE|WED|THU|FRI|SAT)(?:,(?:SUN|MON|TUE|WED|THU|FRI|SAT))*) \*$/.exec(schedule);
    if (!match) return null;
    return match[1] === "*" || match[1]!.split(",").includes(day);

}

export function scheduleLabel(schedule: string): string
{

    if (scheduledOn(schedule, "MON") === null) return "Unknown rotation";
    return schedule.split(" ")[5] === "*" ? "Daily (UTC)" : schedule.split(" ")[5]!.split(",").join(" / ") + " (UTC)";

}

export function offerEligibility(offer: ShopOffer, powerLevel: number | null): "eligible" | "locked" | "unknown"
{

    const c = offer.conditions;
    if (powerLevel !== null && ((c.minPowerLevel !== undefined && powerLevel < c.minPowerLevel) || (c.maxPowerLevel !== undefined && powerLevel > c.maxPowerLevel))) return "locked";
    // Do not assume unrecognized seasonal/roster locks are open.
    if (c.lockId || (powerLevel === null && (c.minPowerLevel !== undefined || c.maxPowerLevel !== undefined))) return "unknown";
    return "eligible";

}

export function sourceMatch(itemId: string, offer: ShopOffer, equipment: ShopCatalog["equipment"]): "exact" | "pool" | null
{

    if (itemId === offer.itemId) return "exact";
    const item = equipment[itemId];
    if (item && offer.itemId === `items${item.rarity}_${item.type}`) return "pool";
    return null;

}

export function sourcesForItem(itemId: string, catalog: ShopCatalog): string[]
{

    return catalog.shops.filter(s => s.coverage === "catalog" && s.offers.some(o => sourceMatch(itemId, o, catalog.equipment))).map(s => s.name);

}

export function itemCategory(id: string): "upgrade" | "equipment" | "other"
{

    return id.startsWith("upg") ? "upgrade" : /^(I_|R_|items|itemAscensionResource_|dust$|mythicDust$)/.test(id) ? "equipment" : "other";

}

export function nextUtcReset(now: number): number
{

    const d = new Date(now);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);

}

export type ShopRecord = {
    id: string; shopId: string; recordedAt: number;
    kind: "stock" | "refresh"; itemId: string; quantity: number;
    cost: number | null; currency: string; expiresAt: number;
    status: "available" | "purchased" | "sold-out";
    method: "ad" | "paid" | "automatic";
};
export function validateRecord(value: unknown, catalog: ShopCatalog): value is ShopRecord
{

    if (!value || typeof value !== "object") return false;
    const r = value as ShopRecord;
    return typeof r.id === "string" && r.id.length > 0 && r.id.length <= 100
        && catalog.shops.some(s => s.id === r.shopId)
        && ["stock", "refresh"].includes(r.kind)
        && typeof r.itemId === "string" && r.itemId.length <= 160
        && (r.kind !== "stock" || r.itemId.length > 0)
        && Number.isInteger(r.quantity) && r.quantity >= 0
        && (r.cost === null || (Number.isFinite(r.cost) && r.cost >= 0))
        && typeof r.currency === "string" && r.currency.length <= 100
        && Number.isFinite(r.recordedAt) && Number.isFinite(r.expiresAt) && r.expiresAt > r.recordedAt
        && ["available", "purchased", "sold-out"].includes(r.status)
        && ["ad", "paid", "automatic"].includes(r.method);

}

export function recordState(record: ShopRecord, records: ShopRecord[], now: number): string
{

    if (record.recordedAt > now) return "Future timestamp — verify";
    if (record.kind === "refresh") return "Refresh logged";
    if (records.some(r => r.shopId === record.shopId && r.recordedAt > record.recordedAt && r.recordedAt <= now && (r.kind === "refresh" || r.itemId === record.itemId))) return "Superseded";
    if (now >= record.expiresAt) return "Expired — recheck shop";
    if (record.status !== "available") return record.status === "purchased" ? "Purchased (manual)" : "Sold out (manual)";
    return "Seen available (manual)";

}

export function refreshesLoggedToday(records: ShopRecord[], shopId: string, now: number): number
{

    const start = nextUtcReset(now) - 86400000;
    return records.filter(r => r.shopId === shopId && r.kind === "refresh" && r.method !== "automatic" && r.recordedAt >= start && r.recordedAt <= now).length;

}
