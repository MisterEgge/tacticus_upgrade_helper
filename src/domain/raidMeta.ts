export type RaidRecommendation = { flex: string[]; lineup: string[]; replays: number; machine: string; sourceUrl: string; sourceUpdatedOn: string; reviewedOn: string };
export type RaidTeam = { core: string[]; flex: string[]; recommendation?: RaidRecommendation };
export type RaidBossMeta = Record<string, Record<string, RaidTeam>>;
