type Slot = "Slot1" | "Slot2" | "Slot3";
export type EquipmentUnit = {
    id: string;
    name?: string;
    progressionIndex: number;
    items: Array<{ slotId: Slot; id: string; name?: string; rarity?: string; level: number }>;
};
type InventoryItem = { id: string; name?: string; amount: number };
type Overrides = { characters: Record<string, Partial<Record<Slot, string[]>>> };

export function allocateEquipment(
    units: EquipmentUnit[],
    inventory: InventoryItem[],
    priorities: Record<string, { priority: number }>,
    compatibility: Overrides,
    preferences: Overrides,
    equipmentNames: Record<string, string> = {}
)
{

    const legendaryUnderTier = units
        .filter((unit) => unit.progressionIndex >= 12 && unit.progressionIndex <= 14)
        .flatMap((unit) =>
            unit.items
                .filter((item) => item.rarity && item.rarity !== "Legendary" && item.rarity !== "Mythic")
                .map((item) => ({
                    character: unit.name ?? unit.id,
                    characterId: unit.id,
                    slotId: item.slotId,
                    currentItem: item.name ?? item.id,
                    currentRarity: item.rarity,
                    currentLevel: item.level,
                    accountPriority: priorities[unit.name ?? ""]?.priority ?? 0
                }))
        )
        .sort((a, b) => b.accountPriority - a.accountPriority || a.character.localeCompare(b.character));

    const inventoryRemaining = new Map<string, number>();
    for (const item of inventory)
    {

        if (Number.isInteger(item.amount) && item.amount > 0)
            inventoryRemaining.set(item.id, (inventoryRemaining.get(item.id) ?? 0) + item.amount);

    }

    const itemNames = new Map<string, string>(Object.entries(equipmentNames));
    for (const unit of units)
    {

        for (const item of unit.items)
        {

            if (item.name)
            {

                itemNames.set(item.id, item.name);

            }

        }

    }
    for (const item of inventory)
    {

        if (item.name)
        {

            itemNames.set(item.id, item.name);

        }

    }

    const equipNow: Array<Record<string, unknown>> = [];
    const buyWatch: Array<Record<string, unknown>> = [];
    const compatibilityUnknown: Array<Record<string, unknown>> = [];

    for (const need of legendaryUnderTier)
    {

        const unit = units.find((candidate) => (candidate.name ?? candidate.id) === need.character);
        const equippedItem = unit?.items.find((item) => item.slotId === need.slotId);
        const sameFamilyLegendaryId = equippedItem?.id.replace(/_E(\d{3})$/, "_L$1");

        const verifiedOverrides = compatibility.characters[need.character]?.[need.slotId as "Slot1" | "Slot2" | "Slot3"] ?? [];
        const preferredOverrides = preferences.characters[need.character]?.[need.slotId as "Slot1" | "Slot2" | "Slot3"] ?? [];
        const allowed = [
            ...verifiedOverrides,
            ...(sameFamilyLegendaryId && sameFamilyLegendaryId !== equippedItem?.id ? [sameFamilyLegendaryId] : [])
        ].filter((id, index, all) => all.indexOf(id) === index);
        const validPreferences = preferredOverrides.filter(id => allowed.includes(id));
        const recommended = [...new Set([
            ...validPreferences,
            ...(sameFamilyLegendaryId && sameFamilyLegendaryId !== equippedItem?.id ? [sameFamilyLegendaryId] : [])
        ])];

        const availableId = recommended.find((id) => allowed.includes(id) && (inventoryRemaining.get(id) ?? 0) > 0);

        if (!allowed.length)
        {

            compatibilityUnknown.push({
                ...need,
                reason: "No verified override and equipped item ID does not expose an Epic-to-Legendary family mapping"
            });
            continue;

        }

        if (availableId)
        {

            const inventoryItem = inventory.find((item) => item.id === availableId);
            inventoryRemaining.set(availableId, (inventoryRemaining.get(availableId) ?? 0) - 1);

            equipNow.push({
                ...need,
                recommendedItemId: availableId,
                recommendedItem: inventoryItem?.name ?? availableId,
                recommendationSource: preferredOverrides.includes(availableId)
                    ? "preferred equipment"
                    : "same equipped item family at Legendary rarity"
            });

        }
        else
        {

            buyWatch.push({
                ...need,
                compatibleLegendaryItemIds: allowed,
                preferredLegendaryItemIds: recommended,
                preferredLegendaryItems: recommended.map((id) => itemNames.get(id) ?? id),
                recommendationSource: validPreferences.length
                    ? "preferred equipment"
                    : "same equipped item family at Legendary rarity"
            });

        }

    }

    return { legendaryUnderTier, equipNow, buyWatch, compatibilityUnknown };

}
