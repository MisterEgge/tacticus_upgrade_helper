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

type EquipmentCompatibility = {\n    characters: Record<string, Partial<Record<"Slot1" | "Slot2" | "Slot3", string[]>>>;\n};\n\ntype CharacterPriority = {
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
    const targets = await readJson<Record<string, AbilityTarget>>("config/ability_targets.json");\n    const compatibility = await readJson<EquipmentCompatibility>("config/equipment_compatibility.json");

    const units = playerResponse.player.units;

    const abilityQueue: AbilityQueueRow[] = units
        .filter((unit) => unit.abilities.length >= 2)
        .map((unit) =>
        {

            const [active, passive] = unit.abilities;
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
                basis: target?.confidence ?? "User level-17 baseline"
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

    const equipNow: Array<Record<string, unknown>> = [];
    const buyWatch: Array<Record<string, unknown>> = [];
    const compatibilityUnknown: Array<Record<string, unknown>> = [];

    for (const need of legendaryUnderTier)
    {

        const allowed = compatibility.characters[need.character]?.[need.slotId as "Slot1" | "Slot2" | "Slot3"];

        if (!allowed?.length)
        {

            compatibilityUnknown.push(need);
            continue;

        }

        const availableId = allowed.find((id) => (inventoryRemaining.get(id) ?? 0) > 0);

        if (availableId)
        {

            const inventoryItem = playerResponse.player.inventory.items.find((item) => item.id === availableId);
            inventoryRemaining.set(availableId, (inventoryRemaining.get(availableId) ?? 0) - 1);

            equipNow.push({
                ...need,
                recommendedItemId: availableId,
                recommendedItem: inventoryItem?.name ?? availableId
            });

        }
        else
        {

            buyWatch.push({
                ...need,
                compatibleLegendaryItemIds: allowed
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
            charactersWithAbilitiesBelow17: abilityQueue.length,\n            individualAbilityUpgradesTo17,
            legendaryUnderTierSlots: legendaryUnderTier.length,
            unequippedItems: playerResponse.player.inventory.items.reduce((sum, item) => sum + item.amount, 0)
        },
        abilityQueue,
        legendaryUnderTier,
        unequippedInventory: playerResponse.player.inventory.items
    };

    await fs.mkdir("output", { recursive: true });
    await fs.writeFile("output/upgrade-report.json", JSON.stringify(report, null, 2));

    console.log(`Player: ${report.source.player} | Power: ${report.source.powerLevel}`);
    console.log(`Units: ${report.summary.units}`);
    console.log(`Characters with abilities below 17: ${report.summary.charactersWithAbilitiesBelow17}`);\n    console.log(`Individual ability upgrades needed to reach 17: ${report.summary.individualAbilityUpgradesTo17}`);\n    console.log(`Equipment: ${equipNow.length} EQUIP NOW | ${buyWatch.length} BUY/WATCH | ${compatibilityUnknown.length} compatibility UNKNOWN`);
    console.log(`Legendary characters with under-tier equipment slots: ${report.summary.legendaryUnderTierSlots}`);
    console.log("Saved output/upgrade-report.json");

}

main().catch((error) =>
{

    console.error(error);
    process.exitCode = 1;

});
