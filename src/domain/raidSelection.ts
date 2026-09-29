import { suggestedRaidFlex } from "./raidLineup";

export type RaidSelection = { boss: string; teamName: string; flex: string[] };
export type RaidTeams = Record<string, Record<string, { core: string[]; flex: string[] }>>;

export function validateRaidSelection(value: unknown, teams: RaidTeams): RaidSelection | null
{
    if (!value || typeof value !== "object") return null;
    const choice = value as Record<string, unknown>;
    if (typeof choice.boss !== "string" || typeof choice.teamName !== "string" || !Array.isArray(choice.flex)) return null;
    const team = teams[choice.boss]?.[choice.teamName];
    if (!team || choice.flex.length > 5 - team.core.length || choice.flex.some(name => typeof name !== "string" || !team.flex.includes(name) || team.core.includes(name))) return null;
    if (new Set(choice.flex).size !== choice.flex.length) return null;
    return { boss: choice.boss, teamName: choice.teamName, flex: choice.flex as string[] };
}

export function defaultRaidSelection(teams: RaidTeams, owned: Set<string>): RaidSelection
{
    const boss = teams["Avatar of Khaine"]?.["Big Hit"] ? "Avatar of Khaine" : Object.keys(teams)[0]!;
    const teamName = teams[boss]?.["Big Hit"] ? "Big Hit" : Object.keys(teams[boss]!)[0]!;
    const team = teams[boss]![teamName]!;
    const members = [...team.core, ...team.flex].map(name => ({ name, owned: owned.has(name) }));
    return { boss, teamName, flex: suggestedRaidFlex(boss, teamName, { ...team, members }) };
}
