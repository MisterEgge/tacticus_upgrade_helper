import { CHARACTER_RARITIES, nextOrbMilestone, progressionRarity, progressionStep, rarityForGoal, type CharacterRarity } from "./characterProgression";
import { utilityAtLeast, type UtilityRating } from "./characterUtility";

export type OrbInventory = Record<string, Array<{ rarity: string; amount: number }>>;
export type OrbCandidate = { id: string; name: string; alliance: string; progressionIndex: number; rank: number;
    shards: number | null; mythicShards: number | null; utility: UtilityRating;
    campaignGoals: Array<{ campaign: string; rank: number | null; ability: number | null; progressKnown: boolean }> };
export type OrbScope = "priorities" | "raid" | "campaign" | "war" | "all";
export type OrbOptions = { scope: OrbScope; includeMythic: boolean; horizon: "next" | "goal" };
export const normalizeAlliance = (value: string) => value.toLowerCase() === "imperium" || value.toLowerCase() === "imperial" ? "Imperial" : value.toLowerCase() === "chaos" ? "Chaos" : value.toLowerCase() === "xenos" ? "Xenos" : value;
export function orbsOwned(inventory: OrbInventory | null | undefined, alliance: string, rarity: CharacterRarity): number | null {
    if (!inventory) return null;
    const stacks = Object.entries(inventory).filter(([key]) => normalizeAlliance(key) === normalizeAlliance(alliance)).flatMap(([, rows]) => Array.isArray(rows) ? rows : [{rarity, amount: NaN}]).filter(row => row.rarity === rarity);
    if (stacks.some(row => !Number.isSafeInteger(row.amount) || row.amount < 0)) return null;
    return stacks.reduce((sum, row) => sum + row.amount, 0);
}
const rarityFloor: Record<CharacterRarity, number> = { Common: 0, Uncommon: 3, Rare: 6, Epic: 9, Legendary: 12, Mythic: 16 };
export function orbPriority(candidate: OrbCandidate, warTarget: number | undefined, options: OrbOptions) {
    if (!["Imperial", "Xenos", "Chaos"].includes(normalizeAlliance(candidate.alliance))) return null;
    const current = progressionRarity(candidate.progressionIndex);
    const next = nextOrbMilestone(candidate.progressionIndex);
    if (!current || !next || (!options.includeMythic && next.orbRarity === "Mythic")) return null;
    const raid = candidate.utility.mainRaidCore || candidate.utility.mainRaidFlex;
    const campaigns = candidate.campaignGoals.filter(goal => CHARACTER_RARITIES.indexOf(rarityForGoal(goal.rank, goal.ability)) > CHARACTER_RARITIES.indexOf(current));
    const war = warTarget !== undefined && CHARACTER_RARITIES.indexOf(rarityForGoal(null, warTarget)) > CHARACTER_RARITIES.indexOf(current);
    let tier = 4, goalIndex = candidate.progressionIndex, reasons: string[] = [];
    const add = (priority: number, goal: number, reason: string) => { tier = Math.min(tier, priority); goalIndex = Math.max(goalIndex, goal); reasons.push(reason); };
    if (raid && ["priorities", "raid", "all"].includes(options.scope)) add(candidate.utility.mainRaidCore ? 0 : 1, Math.max(12, next.to), candidate.utility.mainRaidCore ? "Selected Raid core" : "Selected Raid flex");
    if (["priorities", "campaign", "all"].includes(options.scope)) for (const goal of campaigns) add(2, rarityFloor[rarityForGoal(goal.rank, goal.ability)], `${goal.campaign} Elite target${goal.progressKnown ? "" : " · completion unknown"}`);
    if (war && ["priorities", "war", "all"].includes(options.scope)) add(3, warTarget === 35 ? 9 : 6, `Active War ${warTarget === 35 ? "Gold" : "Silver"} slot`);
    // Utility is a fallback for the bench, never a reason to exceed an active War cap.
    if (!reasons.length && options.scope === "priorities" && !warTarget && utilityAtLeast(candidate.utility.tier, "Useful")) {
        const floor = ["Core", "Strong"].includes(candidate.utility.tier) ? 12 : 9;
        if (candidate.progressionIndex < floor) add(4, floor, `${candidate.utility.tier} usefulness · planning floor`);
    }
    if (options.scope === "all" && !reasons.length) add(5, next.to, "Manual full-roster scope");
    if (!reasons.length || goalIndex < next.to) return null;
    if (!options.includeMythic) goalIndex = Math.min(goalIndex, 15);
    return { tier, goalIndex, reasons };
}
export function orbPlan(candidates: OrbCandidate[], inventory: OrbInventory | null | undefined, warTargets: Map<string, number>, options: OrbOptions) {
    const planned = candidates.flatMap(candidate => {
        const priority = orbPriority(candidate, warTargets.get(candidate.name), options);
        const next = nextOrbMilestone(candidate.progressionIndex);
        if (!priority || !next) return [];
        const end = options.horizon === "next" ? next.to : priority.goalIndex;
        const costs: Partial<Record<CharacterRarity, number>> = {};
        let shards = 0, mythicShards = 0;
        for (let from = candidate.progressionIndex; from < end; from++) {
            const step = progressionStep(from)!;
            shards += step.shards; mythicShards += step.mythicShards;
            if (step.orbRarity) costs[step.orbRarity] = (costs[step.orbRarity] ?? 0) + step.orbs;
        }
        const shardShortfall = shards === 0 ? 0 : candidate.shards === null ? null : Math.max(0, shards - candidate.shards);
        const mythicShardShortfall = mythicShards === 0 ? 0 : candidate.mythicShards === null ? null : Math.max(0, mythicShards - candidate.mythicShards);
        return [{ ...candidate, alliance: normalizeAlliance(candidate.alliance), ...priority, next, end, costs, shardsNeeded: shards, mythicShardsNeeded: mythicShards, shardShortfall, mythicShardShortfall }];
    }).sort((a, b) => a.tier - b.tier || Number(b.next.promotions === 0) - Number(a.next.promotions === 0)
        || (b.utility.communityScore ?? 0) - (a.utility.communityScore ?? 0) || b.utility.accountPriority - a.utility.accountPriority
        || (a.shardShortfall ?? Infinity) - (b.shardShortfall ?? Infinity) || a.name.localeCompare(b.name));
    const remaining = new Map<string, number | null>();
    const rows = planned.map(row => {
        const allocations = CHARACTER_RARITIES.filter(rarity => (row.costs[rarity] ?? 0) > 0).map(rarity => {
            const key = `${normalizeAlliance(row.alliance)}:${rarity}`;
            if (!remaining.has(key)) remaining.set(key, orbsOwned(inventory, row.alliance, rarity));
            const available = remaining.get(key)!;
            const needed = row.costs[rarity]!;
            const reserved = available === null ? null : Math.min(available, needed);
            if (available !== null) remaining.set(key, available - reserved!);
            return { rarity, needed, reserved, shortfall: reserved === null ? null : needed - reserved };
        });
        return { ...row, allocations };
    });
    const pools = ["Imperial", "Xenos", "Chaos"].flatMap(alliance => CHARACTER_RARITIES.flatMap(rarity => {
        const recipients = rows.filter(row => normalizeAlliance(row.alliance) === alliance && (row.costs[rarity] ?? 0) > 0);
        if (!recipients.length) return [];
        const needed = recipients.reduce((sum, row) => sum + row.costs[rarity]!, 0);
        const owned = orbsOwned(inventory, alliance, rarity);
        return [{ alliance, rarity, needed, owned, shortfall: owned === null ? null : Math.max(0, needed - owned), recipients: recipients.map(row => row.name) }];
    }));
    return { rows, pools, unknown: candidates.filter(candidate => !progressionRarity(candidate.progressionIndex) || !["Imperial", "Xenos", "Chaos"].includes(normalizeAlliance(candidate.alliance))).map(candidate => candidate.name) };
}
/** Known orb-producing honor stages; sector controls the chance, not a daily guarantee. */
export function orbHonorees(candidates: OrbCandidate[], alliance: string, rarity: CharacterRarity): string[] {
    return candidates.filter(candidate => normalizeAlliance(candidate.alliance) === alliance && (
        candidate.progressionIndex === ({ Uncommon: 2, Rare: 5, Epic: 8 } as Partial<Record<CharacterRarity, number>>)[rarity]
        || rarity === "Legendary" && candidate.progressionIndex >= 11 && candidate.progressionIndex <= 14
        || rarity === "Mythic" && candidate.progressionIndex >= 15 && candidate.progressionIndex <= 18
    )).map(candidate => candidate.name);
}
