export type RaidRecommendation = { flex: string[]; lineup: string[]; replays: number; machine: string; sourceUrl: string; sourceUpdatedOn: string; reviewedOn: string };
export type RaidMachineRecommendation = { name: string; alternatives: string[]; sourceUrl: string; reviewedOn: string; note: string };
export type RaidTeam = { core: string[]; flex: string[]; fallbacks?: string[]; excluded?: string[]; excludedMachines?: string[]; restrictionNote?: string; fallbackNote?: string; machine?: RaidMachineRecommendation; recommendation?: RaidRecommendation };
export type RaidBossMeta = Record<string, Record<string, RaidTeam>>;
