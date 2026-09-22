export const RANK_NAMES = ["Stone I", "Stone II", "Stone III", "Iron I", "Iron II", "Iron III", "Bronze I", "Bronze II", "Bronze III", "Silver I", "Silver II", "Silver III", "Gold I", "Gold II", "Gold III", "Diamond I", "Diamond II", "Diamond III", "Adamantine I", "Adamantine II"] as const;

export function rankName(rank: number): string
{
    return RANK_NAMES[rank] ?? `Unknown rank (${rank})`;
}
