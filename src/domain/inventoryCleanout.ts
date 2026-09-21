export type CleanoutInventoryItem = { id: string; name?: string; level: number; amount: number };
export type CleanoutUnit = { id: string; name: string; progressionIndex: number; items: Array<{ slotId: string; id: string; rarity?: string; level: number }> };\nexport type CleanoutCatalogCharacter = { id: string; equipment: string[] };
export type CleanoutDemand = { recommendedItemId?: string; compatibleLegendaryItemIds?: string[]; preferredLegendaryItemIds?: string[] };
export type CleanoutRow = CleanoutInventoryItem & { keep: number; scrap: number; status: "SCRAP SAFE" | "EXCESS" | "KEEP / RESERVED" | "UNKNOWN — DO NOT SCRAP"; reason: string };

const rarityCode = (id: string) => id.match(/_([CUR EL M])\d{3}$/x);
function rarityIndexFromId(id: string): number | null
{

    const match = id.match(/_([CURELM])\d{3}$/);
    if (!match) return null;
    return ({ C: 0, U: 1, R: 2, E: 3, L: 4, M: 5 } as Record<string, number>)[match[1]!] ?? null;

}
function family(id: string): string | null
{

    return rarityIndexFromId(id) === null ? null : id.replace(/_([CURELM])(\d{3})$/, "_$2");

}
function progressionRarityIndex(progressionIndex: number): number
{

    return Math.min(5, Math.floor(progressionIndex / 3));

}

export function inventoryCleanout(items: CleanoutInventoryItem[], units: CleanoutUnit[], demands: CleanoutDemand[], catalog: CleanoutCatalogCharacter[]): CleanoutRow[]
{

    const catalogById = new Map(catalog.map(character => [character.id, character]));\n    const demandIds = new Set(demands.flatMap(d => [d.recommendedItemId, ...(d.compatibleLegendaryItemIds ?? []), ...(d.preferredLegendaryItemIds ?? [])].filter((x): x is string => !!x)));
    return items.map(item =>
    {

        const itemRarity = rarityIndexFromId(item.id);
        const itemFamily = family(item.id);
        if (!completeCharacterCatalog || itemRarity === null || itemFamily === null)
            return { ...item, keep: item.amount, scrap: 0, status: "UNKNOWN — DO NOT SCRAP" as const, reason: "Item family/rarity or complete recipient pool is not verified." };
        const equippedSameFamily = units.flatMap(unit => unit.items.map(equipped => ({ unit, equipped }))).filter(x => family(x.equipped.id) === itemFamily);
        if (!equippedSameFamily.length)
            return { ...item, keep: item.amount, scrap: 0, status: "UNKNOWN — DO NOT SCRAP" as const, reason: "No equipped same-family item proves which characters can use this family." };
        const possibleRecipients = new Map(equippedSameFamily.map(x => [x.unit.id, x]));
        const reserve = [...possibleRecipients.values()].filter(({ unit, equipped }) =>
        {

            const characterRarity = progressionRarityIndex(unit.progressionIndex);
            const equippedRarity = rarityIndexFromId(equipped.id);
            if (equippedRarity === null) return true;
            return itemRarity > equippedRarity && itemRarity <= characterRarity;

        }).length;
        const explicitDemand = demandIds.has(item.id) ? 1 : 0;
        const keep = Math.min(item.amount, Math.max(reserve, explicitDemand));
        const scrap = Math.max(0, item.amount - keep);
        if (!scrap) return { ...item, keep, scrap, status: "KEEP / RESERVED" as const, reason: reserve ? `${reserve} compatible character(s) can still upgrade into this rarity.` : "Current equipment plan reserves this item." };
        return { ...item, keep, scrap, status: keep ? "EXCESS" as const : "SCRAP SAFE" as const, reason: keep ? `Keep ${keep} for verified future recipients; ${scrap} extra cop${scrap === 1 ? "y is" : "ies are"} surplus.` : "All verified same-family recipients already meet or exceed this item's rarity." };

    }).sort((a, b) => b.scrap - a.scrap || a.status.localeCompare(b.status) || (a.name ?? a.id).localeCompare(b.name ?? b.id));

}
