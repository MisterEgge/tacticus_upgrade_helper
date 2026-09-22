export type RaidTeam = { core: string[]; flex: string[] };
export type RaidBossMeta = Record<string, Record<string, RaidTeam>>;
