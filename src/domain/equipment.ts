import {preferredEquipmentItemId} from "./equipmentOptions";
import {minimumBlockReplacementLevel} from "./blockEquipment";
import {equipmentStatsAtLevel,type EquipmentCharacter,type EquipmentDefinition} from "./equipmentCompatibility";
import {tierUpgradeItemId} from "./equipmentTier";
import {progressionRarity} from "./characterProgression";
type Slot = "Slot1" | "Slot2" | "Slot3";
export type EquipmentUnit = {
    id: string;
    name?: string;
    faction?:string;
    progressionIndex: number;
    items: Array<{ slotId: Slot; id: string; name?: string; rarity?: string; level: number }>;
};
type InventoryItem = { id: string; name?: string; amount: number;level?:number };
type Overrides = { characters: Record<string, Partial<Record<Slot, string[]>>> };

export function allocateEquipment(
    units: EquipmentUnit[],
    inventory: InventoryItem[],
    priorities: Record<string, { priority: number }>,
    compatibility: Overrides,
    preferences: Overrides,
    equipmentNames: Record<string, string> = {},
    equipment:Record<string,EquipmentDefinition> = {},
    characters:EquipmentCharacter[] = []
)
{

    const legendaryUnderTier = units
        .filter((unit) => progressionRarity(unit.progressionIndex)==="Legendary"||progressionRarity(unit.progressionIndex)==="Mythic")
        .flatMap((unit) =>
            unit.items
                .filter((item) => {
                    const meta=characters.find(character=>character.id===unit.id);
                    const preferred=meta?preferredEquipmentItemId({id:unit.id,faction:unit.faction??meta.faction},meta.traits??[],meta.equipment,"Legendary",item.id,equipment):null;
                    return item.rarity&&item.rarity!=="Mythic"&&(item.rarity!=="Legendary"||!!preferred);
                })
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
    const inventoryCopies=inventory.map(item=>({...item,level:item.level??1})).sort((a,b)=>b.level-a.level);
    for (const item of inventory)
    {

        if (Number.isInteger(item.amount) && item.amount > 0)
            inventoryRemaining.set(item.id, (inventoryRemaining.get(item.id) ?? 0) + item.amount);

    }

    const itemNames = new Map<string, string>(Object.entries(equipmentNames));
    for(const [id,item] of Object.entries(equipment))if(item.name)itemNames.set(id,item.name);
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
        const meta=characters.find(character=>character.id===unit?.id);
        const preferred=unit&&meta&&equippedItem?preferredEquipmentItemId({id:unit.id,faction:unit.faction??meta.faction},meta.traits??[],meta.equipment,"Legendary",equippedItem.id,equipment):null;
        const sameFamilyLegendaryId = equippedItem&&equipment[equippedItem.id]?tierUpgradeItemId(equippedItem.rarity??"",equippedItem.id,"Legendary",equipment):equippedItem?.id.replace(/_E(\d{3})$/, "_L$1");

        const verifiedOverrides = compatibility.characters[need.character]?.[need.slotId as "Slot1" | "Slot2" | "Slot3"] ?? [];
        const preferredOverrides = preferences.characters[need.character]?.[need.slotId as "Slot1" | "Slot2" | "Slot3"] ?? [];
        const allowed = [
            ...(preferred?[preferred]:[]),
            ...verifiedOverrides,
            ...(sameFamilyLegendaryId && sameFamilyLegendaryId !== equippedItem?.id ? [sameFamilyLegendaryId] : [])
        ].filter((id, index, all) => all.indexOf(id) === index);
        const validPreferences = preferredOverrides.filter(id => allowed.includes(id));
        const recommended = preferred?[preferred]:[...new Set([
            ...validPreferences,
            ...(sameFamilyLegendaryId && sameFamilyLegendaryId !== equippedItem?.id ? [sameFamilyLegendaryId] : [])
        ])];

        const booster=unit?.items.find(item=>equipment[item.id]?.type==="I_Booster_Block");
        const bonus=booster?equipmentStatsAtLevel(equipment[booster.id],booster.level):null;
        const minimumLevelFor=(id:string)=>equippedItem&&equipment[equippedItem.id]?.type==="I_Block"?(booster&&!bonus?null:minimumBlockReplacementLevel(equippedItem,id,equipment,{chance:bonus?.blockChanceBonus??0,damage:bonus?.blockDamageBonus??0})):1;
        const availableId = recommended.find((id) => {
            const minimumLevel=minimumLevelFor(id);
            return minimumLevel!==null&&allowed.includes(id)&&(inventoryRemaining.get(id)??0)>0&&inventoryCopies.some(item=>item.id===id&&item.amount>0&&item.level>=minimumLevel);
        });

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

            const inventoryItem = inventoryCopies.find((item) => item.id === availableId&&item.amount>0&&item.level>=minimumLevelFor(availableId)!)!;
            inventoryItem.amount--;
            inventoryRemaining.set(availableId, (inventoryRemaining.get(availableId) ?? 0) - 1);

            equipNow.push({
                ...need,
                recommendedItemId: availableId,
                recommendedItem: inventoryItem?.name ?? availableId,
                allocatedLevel:inventoryItem.level,
                recommendationSource: preferred?"Verified equipment preference":preferredOverrides.includes(availableId)
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
                recommendationSource: preferred?"Verified equipment preference; check replacement refinement":validPreferences.length
                    ? "preferred equipment"
                    : "same equipped item family at Legendary rarity"
            });

        }

    }

    return { legendaryUnderTier, equipNow, buyWatch, compatibilityUnknown };

}
