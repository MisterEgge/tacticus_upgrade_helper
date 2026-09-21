export type CleanoutInventoryItem = { id: string; name?: string; level: number; amount: number };
export type CleanoutUnit = { id: string; name: string; progressionIndex: number; items: Array<{ slotId: string; id: string; rarity?: string; level: number }> };
export type CleanoutCatalogCharacter = { id: string; equipment: string[] };
export type CleanoutDemand = { recommendedItemId?: string; compatibleLegendaryItemIds?: string[]; preferredLegendaryItemIds?: string[] };
export type CleanoutRow = CleanoutInventoryItem & { keep: number; scrap: number; status: "SCRAP SAFE" | "EXCESS" | "KEEP / RESERVED" | "UNKNOWN — DO NOT SCRAP"; reason: string };

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

    const demandCounts = new Map<string, number>();
    for (const demand of demands)
        for (const id of [demand.recommendedItemId, ...(demand.compatibleLegendaryItemIds ?? []), ...(demand.preferredLegendaryItemIds ?? [])])
            if (id) demandCounts.set(id, (demandCounts.get(id) ?? 0) + 1);
    const ownedById = new Map(units.map(unit => [unit.id, unit]));
    return items.map(item =>
    {

        const itemRarity = rarityIndexFromId(item.id);
        const itemFamily = family(item.id);
        if (itemRarity === null || itemFamily === null)
            return { ...item, keep: item.amount, scrap: 0, status: "UNKNOWN — DO NOT SCRAP" as const, reason: "Item family or rarity is not verified." };
        const itemType = item.id.replace(/_[CURELM]\d{3}$/, "");
        const catalogRecipients = catalog.filter(character => character.equipment.includes(itemType));
        if (!catalogRecipients.length)
            return { ...item, keep: item.amount, scrap: 0, status: "UNKNOWN — DO NOT SCRAP" as const, reason: "No catalog equipment compatibility exists for this item type." };
        if (catalogRecipients.some(character => !ownedById.has(character.id)))
            return { ...item, keep: item.amount, scrap: 0, status: "UNKNOWN — DO NOT SCRAP" as const, reason: "At least one compatible character is not unlocked; reserve cannot be proven complete." };
        const recipients = catalogRecipients.map(character =>
        {

            const unit = ownedById.get(character.id)!;
            const equipped = unit.items.find(candidate => candidate.id.startsWith(itemType + "_") || family(candidate.id) === itemFamily);
            return { unit, equipped };

        });
        if (recipients.some(recipient => !recipient.equipped))
            return { ...item, keep: item.amount, scrap: 0, status: "UNKNOWN — DO NOT SCRAP" as const, reason: "A compatible unlocked character has no matching equipped slot/family proof." };
        const reserve = recipients.filter(({ unit, equipped }) =>
        {

            const equippedRarity = rarityIndexFromId(equipped!.id);
            return equippedRarity === null || (itemRarity > equippedRarity && itemRarity <= progressionRarityIndex(unit.progressionIndex));

        }).length;
        const explicitDemand = demandCounts.get(item.id) ?? 0;
        const keep = Math.min(item.amount, Math.max(reserve, explicitDemand));
        const scrap = Math.max(0, item.amount - keep);
        if (!scrap) return { ...item, keep, scrap, status: "KEEP / RESERVED" as const, reason: reserve ? `${reserve} compatible character(s) can still upgrade into this rarity.` : "Current equipment plan reserves this item." };
        return { ...item, keep, scrap, status: keep ? "EXCESS" as const : "SCRAP SAFE" as const, reason: keep ? `Keep ${keep} for verified future recipients; ${scrap} extra cop${scrap === 1 ? "y is" : "ies are"} surplus.` : "All verified compatible recipients already meet or exceed this item's rarity." };

    }).sort((a, b) => b.scrap - a.scrap || a.status.localeCompare(b.status) || (a.name ?? a.id).localeCompare(b.name ?? b.id));

}
