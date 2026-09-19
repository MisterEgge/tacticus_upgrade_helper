import fs from "node:fs/promises";

type Ability = {
    id: string;
    level: number;
};

type UnitItem = {
    slotId: "Slot1" | "Slot2" | "Slot3";
    level: number;
    id: string;
    name?: string;
    rarity?: string;
};

type Unit = {
    id: string;
    name?: string;
    faction?: string;
    grandAlliance?: "Imperial" | "Xenos" | "Chaos";
    progressionIndex: number;
    rank: number;
    xpLevel: number;
    abilities: Ability[];
    items: UnitItem[];
    shards?: number;
    mythicShards?: number;
};

type PlayerResponse = {
    metaData: {
        configHash: string;
        lastUpdatedOn: number;
        scopes: string[];
    };
    player: {
        details: {
            name: string;
            powerLevel: number;
        };
        units: Unit[];
        inventory: {
            items: Array<{
                id: string;
                name?: string;
                level: number;
                amount: number;
            }>;
        };
    };
};

type AbilityTarget = {
    active: string;
    passive: string;
    focus: string;
    confidence: string;
};

type EquipmentCompatibility = {
    characters: Record<string, Partial<Record<"Slot1" | "Slot2" | "Slot3", string[]>>>;
};

type EquipmentPreferences = {
    characters: Record<string, Partial<Record<"Slot1" | "Slot2" | "Slot3", string[]>>>;
};

type CharacterPriority = {
    priority: number;
    modes: string[];
    note: string;
};

type AbilityQueueRow = {
    character: string;
    faction: string;
    activeId: string;
    activeLevel: number;
    passiveId: string;
    passiveLevel: number;
    activeTo17: boolean;
    passiveTo17: boolean;
    accountPriority: number;
    focus: string;
    basis: string;
    communityActiveTarget: string;
    communityPassiveTarget: string;
    targetConfidence: string;
};

const RARITY_BY_PROGRESSION = [
    "Common", "Common", "Common",
    "Uncommon", "Uncommon", "Uncommon",
    "Rare", "Rare", "Rare",
    "Epic", "Epic", "Epic",
    "Legendary", "Legendary", "Legendary",
    "Mythic"
] as const;

async function readJson<T>(path: string): Promise<T>
{

    return JSON.parse(await fs.readFile(path, "utf8")) as T;

}

function rarityFor(unit: Unit): string
{

    return RARITY_BY_PROGRESSION[unit.progressionIndex] ?? "Unknown";

}

async function main()
{

    const playerResponse = await readJson<PlayerResponse>("data/player.json");
    const priorities = await readJson<Record<string, CharacterPriority>>("config/character_priorities.json");
    const targets = await readJson<Record<string, AbilityTarget>>("config/ability_targets.json");
    const compatibility = await readJson<EquipmentCompatibility>("config/equipment_compatibility.json");
    const preferences = await readJson<EquipmentPreferences>("config/equipment_preferences.json");
    const equipmentNames = await readJson<Record<string, string>>("config/equipment_names.json");

    const units = playerResponse.player.units;

    const abilityQueue: AbilityQueueRow[] = units
        .filter((unit) => unit.abilities.length >= 2)
        .map((unit) =>
        {

            const active = unit.abilities[0]!;
            const passive = unit.abilities[1]!;
            const target = targets[unit.name ?? ""];
            const priority = priorities[unit.name ?? ""]?.priority ?? 0;

            return {
                character: unit.name ?? unit.id,
                faction: unit.faction ?? "",
                activeId: active.id,
                activeLevel: active.level,
                passiveId: passive.id,
                passiveLevel: passive.level,
                activeTo17: active.level > 0 && active.level < 17,
                passiveTo17: passive.level > 0 && passive.level < 17,
                accountPriority: priority,
                focus: target?.focus ?? "Baseline / review",
                basis: target?.confidence ?? "User level-17 baseline",
                communityActiveTarget: target?.active ?? "Review",
                communityPassiveTarget: target?.passive ?? "Review",
                targetConfidence: target?.confidence ?? "baseline-only"
            };

        })
        .filter((row) => row.activeTo17 || row.passiveTo17)
        .sort((a, b) => b.accountPriority - a.accountPriority || a.character.localeCompare(b.character));

    const legendaryUnderTier = units
        .filter((unit) => rarityFor(unit) === "Legendary")
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

    const inventoryRemaining = new Map<string, number>(
        playerResponse.player.inventory.items.map((item) => [item.id, item.amount])
    );

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
    for (const item of playerResponse.player.inventory.items)
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
        const recommended = preferredOverrides.length
            ? preferredOverrides
            : (sameFamilyLegendaryId && sameFamilyLegendaryId !== equippedItem?.id ? [sameFamilyLegendaryId] : []);

        const availableId = recommended.find((id) => (inventoryRemaining.get(id) ?? 0) > 0);

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

            const inventoryItem = playerResponse.player.inventory.items.find((item) => item.id === availableId);
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
                recommendationSource: preferredOverrides.length
                    ? "preferred equipment"
                    : "same equipped item family at Legendary rarity"
            });

        }

    }

    const individualAbilityUpgradesTo17 = abilityQueue.reduce(
        (sum, row) => sum + Number(row.activeTo17) + Number(row.passiveTo17),
        0
    );

    const report = {
        generatedAt: new Date().toISOString(),
        source: {
            player: playerResponse.player.details.name,
            powerLevel: playerResponse.player.details.powerLevel,
            apiLastUpdatedOn: playerResponse.metaData.lastUpdatedOn,
            configHash: playerResponse.metaData.configHash
        },
        summary: {
            units: units.length,
            charactersWithAbilitiesBelow17: abilityQueue.length,
            individualAbilityUpgradesTo17,
            legendaryUnderTierSlots: legendaryUnderTier.length,
            unequippedItems: playerResponse.player.inventory.items.reduce((sum, item) => sum + item.amount, 0)
        },
        abilityQueue,
        roster: units.map((unit) => ({
            id: unit.id,
            name: unit.name ?? unit.id,
            faction: unit.faction ?? "",
            grandAlliance: unit.grandAlliance ?? "",
            rarity: rarityFor(unit),
            rank: unit.rank,
            xpLevel: unit.xpLevel,
            progressionIndex: unit.progressionIndex,
            shards: unit.shards ?? 0,
            mythicShards: unit.mythicShards ?? 0,
            abilities: unit.abilities,
            items: unit.items
        })),
        legendaryUnderTier,
        equipmentAllocation: {
            equipNow,
            buyWatch,
            compatibilityUnknown
        },
        unequippedInventory: playerResponse.player.inventory.items
    };

    await fs.mkdir("output", { recursive: true });
    await fs.writeFile("output/upgrade-report.json", JSON.stringify(report, null, 2));

    console.log(`Player: ${report.source.player} | Power: ${report.source.powerLevel}`);
    console.log(`Units: ${report.summary.units}`);
    console.log(`Characters with abilities below 17: ${report.summary.charactersWithAbilitiesBelow17}`);
    console.log(`Individual ability upgrades needed to reach 17: ${report.summary.individualAbilityUpgradesTo17}`);
    console.log(`Equipment: ${equipNow.length} EQUIP NOW | ${buyWatch.length} BUY/WATCH | ${compatibilityUnknown.length} compatibility UNKNOWN`);
    console.log("\nEQUIP NOW");
    console.table(equipNow);
    console.log("\nBUY / WATCH");
    console.table(buyWatch);
    if (compatibilityUnknown.length)
    {

        console.log("\nCOMPATIBILITY UNKNOWN");
        console.table(compatibilityUnknown);

    }
    console.log(`Legendary under-tier equipment slots: ${report.summary.legendaryUnderTierSlots}`);
    console.log("Saved output/upgrade-report.json");

}

main().catch((error) =>
{

    console.error(error);
    process.exitCode = 1;

});
