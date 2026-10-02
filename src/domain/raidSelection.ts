import { suggestedRaidFlex } from "./raidLineup";
import type { RaidTeam } from "./raidMeta";

export type RaidSelection = { boss: string; teamName: string; flex: string[]; autoFlex?: boolean };
export type RaidTeams = Record<string, Record<string, RaidTeam>>;

export function validateRaidSelection(value: unknown, teams: RaidTeams): RaidSelection | null
{
    if (!value || typeof value !== "object") return null;
    const choice = value as Record<string, unknown>;
    if (typeof choice.boss !== "string" || typeof choice.teamName !== "string" || !Array.isArray(choice.flex)) return null;
    const team = teams[choice.boss]?.[choice.teamName];
    if (!team || choice.flex.length > 5 - team.core.length || choice.flex.some(name => typeof name !== "string" || !team.flex.includes(name) || team.core.includes(name))) return null;
    if (new Set(choice.flex).size !== choice.flex.length) return null;
    if (choice.autoFlex !== undefined && typeof choice.autoFlex !== "boolean") return null;
    return { boss: choice.boss, teamName: choice.teamName, flex: choice.flex as string[], ...(typeof choice.autoFlex === "boolean" ? { autoFlex: choice.autoFlex } : {}) };
}

// Legacy saves enter auto mode once; explicit manual overrides are honored.
// Re-resolve with each report so newly unlocked preferred flex replaces a fallback.
export function resolveRaidSelection(value: unknown, teams: RaidTeams, owned: Set<string>): RaidSelection
{
    const choice = value && typeof value === "object" ? value as Record<string, unknown> : null;
    // Keep the boss/core when an automatic cookie contains an obsolete flex name.
    const context = choice && (choice.autoFlex === undefined || choice.autoFlex === true)
        ? validateRaidSelection({ ...choice, flex: [], autoFlex: true }, teams) : null;
    const selection = validateRaidSelection(value, teams) ?? context ?? defaultRaidSelection(teams, owned);
    if (selection.autoFlex === false) return selection;
    const team = teams[selection.boss]![selection.teamName]!;
    const members = [...team.core, ...team.flex].map(name => ({ name, owned: owned.has(name) }));
    return { ...selection, autoFlex: true, flex: suggestedRaidFlex(selection.boss, selection.teamName, { ...team, members }) };
}

export function defaultRaidSelection(teams: RaidTeams, owned: Set<string>): RaidSelection
{
    const boss = teams["Avatar of Khaine"]?.["Big Hit"] ? "Avatar of Khaine" : Object.keys(teams)[0]!;
    const teamName = teams[boss]?.["Big Hit"] ? "Big Hit" : Object.keys(teams[boss]!)[0]!;
    const team = teams[boss]![teamName]!;
    const members = [...team.core, ...team.flex].map(name => ({ name, owned: owned.has(name) }));
    return { boss, teamName, autoFlex: true, flex: suggestedRaidFlex(boss, teamName, { ...team, members }) };
}
