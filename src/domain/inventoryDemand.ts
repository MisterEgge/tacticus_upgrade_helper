export type DemandTarget = { itemId: string; itemName: string; character: string; priority: number };

export type DemandEquipmentRow = {
    character: string;
    accountPriority: number;
    recommendedItemId?: string;
    recommendedItem?: string;
    preferredLegendaryItemIds?: string[];
    preferredLegendaryItems?: string[];
};

export function inventoryDemandTargets(rows: DemandEquipmentRow[]): DemandTarget[]
{

    const byTarget = new Map<string, DemandTarget>();
    for (const row of rows)
    {

        const preferredIds = row.preferredLegendaryItemIds ?? [];
        // A recommended inventory item is exact. Multiple preferred IDs are alternatives,
        // not multiple required copies and not a license to choose one arbitrarily.
        const itemId = row.recommendedItemId ?? (preferredIds.length === 1 ? preferredIds[0] : undefined);
        if (!itemId) continue;
        const itemName = row.recommendedItem ?? (preferredIds.length === 1 ? row.preferredLegendaryItems?.[0] : undefined) ?? itemId;
        const target = { itemId, itemName, character: row.character, priority: row.accountPriority };
        const key = `${itemId}::${row.character}`;
        const existing = byTarget.get(key);
        if (!existing || target.priority > existing.priority) byTarget.set(key, target);

    }
    return [...byTarget.values()];

}
