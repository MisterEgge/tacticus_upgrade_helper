// API progression indexes, cross-checked against Tacticus Planner and the wiki.
export const CHARACTER_RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"] as const;
export type CharacterRarity = typeof CHARACTER_RARITIES[number];
export const PROGRESSION_RARITIES: readonly CharacterRarity[] = [
    "Common", "Common", "Common", "Uncommon", "Uncommon", "Uncommon",
    "Rare", "Rare", "Rare", "Epic", "Epic", "Epic",
    "Legendary", "Legendary", "Legendary", "Legendary", "Mythic", "Mythic", "Mythic", "Mythic"
];
export function progressionRarity(index: number): CharacterRarity | null {
    return Number.isInteger(index) ? PROGRESSION_RARITIES[index] ?? null : null;
}
// Visible star colours/counts, verified against Tacticus Planner at
// 5c5d05193038a0aadb1fd929cce877ef754f7868 (RarityStars and StarsIcon).
const STAR_LABELS = [
    "no stars", "1 yellow star", "2 yellow stars", "2 yellow stars", "3 yellow stars", "4 yellow stars",
    "4 yellow stars", "5 yellow stars", "1 red star", "1 red star", "2 red stars", "3 red stars",
    "3 red stars", "4 red stars", "5 red stars", "1 blue star", "1 blue star", "2 blue stars", "3 blue stars", "wings"
] as const;
export function progressionLabel(index: number): string {
    const rarity = progressionRarity(index);
    return rarity ? `${rarity} · ${STAR_LABELS[index]}` : "Unknown progression";
}
export type ProgressionStep = { from: number; to: number; shards: number; mythicShards: number; orbRarity: CharacterRarity | null; orbs: number };
// Costs to leave each index. Unlock costs are deliberately excluded.
const shardCosts = [10, 15, 15, 15, 15, 20, 30, 40, 50, 65, 85, 100, 150, 250, 500, 20, 30, 50, 100];
const orbCosts = [0, 0, 10, 0, 0, 10, 0, 0, 10, 0, 0, 10, 10, 15, 20, 10, 10, 15, 25];
export function progressionStep(index: number): ProgressionStep | null {
    if (!progressionRarity(index) || index >= 19) return null;
    return { from: index, to: index + 1, shards: index < 15 ? shardCosts[index]! : 0,
        mythicShards: index >= 15 ? shardCosts[index]! : 0,
        orbs: orbCosts[index]!, orbRarity: orbCosts[index] ? progressionRarity(index + 1) : null };
}
/** Includes intervening shard-only promotions, stopping at the first orb spend. */
export function nextOrbMilestone(index: number) {
    let shards = 0, mythicShards = 0;
    for (let from = index; from < 19; from++) {
        const step = progressionStep(from);
        if (!step) return null;
        shards += step.shards; mythicShards += step.mythicShards;
        if (step.orbRarity) return { ...step, shards, mythicShards, promotions: from - index };
    }
    return null;
}
export function rarityForGoal(rank: number | null, ability: number | null): CharacterRarity {
    const rankCaps = [3, 6, 9, 12, 17, 20];
    const abilityCaps = [8, 17, 26, 35, 50, 60];
    return CHARACTER_RARITIES.find((_, i) => (rank ?? 0) <= rankCaps[i]! && (ability ?? 0) <= abilityCaps[i]!) ?? "Mythic";
}
