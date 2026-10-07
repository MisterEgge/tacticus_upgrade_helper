import { raidCandidates, suggestedRaidLineup } from "./raidLineup";
import { RAID_MACHINES, suggestedRaidMachine } from "./raidMachine";
import type { RaidTeam } from "./raidMeta";

export type RaidSelection = { boss: string; teamName: string; flex: string[]; autoFlex?: boolean; lineup?: string[]; machine?: string | null; autoMachine?: boolean };
export type RaidTeams = Record<string, Record<string, RaidTeam>>;

export function validateRaidSelection(value: unknown, teams: RaidTeams): RaidSelection | null
{
    if (!value || typeof value !== "object") return null;
    const choice = value as Record<string, unknown>;
    if (typeof choice.boss !== "string" || typeof choice.teamName !== "string" || !Array.isArray(choice.flex)) return null;
    const team = teams[choice.boss]?.[choice.teamName];
    if (!team) return null;
    const candidates = raidCandidates(team);
    if (choice.lineup !== undefined && (!Array.isArray(choice.lineup) || choice.lineup.length > 5 || new Set(choice.lineup).size !== choice.lineup.length || choice.lineup.some(name => typeof name !== "string" || !candidates.includes(name)))) return null;
    if (choice.lineup === undefined && (choice.flex.length > 5 - team.core.length || choice.flex.some(name => typeof name !== "string" || !team.flex.includes(name) || team.core.includes(name)))) return null;
    const providedLineup = Array.isArray(choice.lineup) ? choice.lineup : null;
    if (providedLineup && (choice.flex.some(name => typeof name !== "string" || !providedLineup.includes(name) || team.core.includes(name)) || choice.flex.length !== providedLineup.filter(name => !team.core.includes(name as string)).length)) return null;
    if (new Set(choice.flex).size !== choice.flex.length) return null;
    if (choice.autoFlex !== undefined && typeof choice.autoFlex !== "boolean") return null;
    if (choice.autoMachine !== undefined && typeof choice.autoMachine !== "boolean") return null;
    if (choice.machine !== undefined && choice.machine !== null && (!RAID_MACHINES.some(machine => machine.name === choice.machine) || team.excludedMachines?.includes(choice.machine as string))) return null;
    return { boss: choice.boss, teamName: choice.teamName, flex: choice.flex as string[], ...(typeof choice.autoFlex === "boolean" ? { autoFlex: choice.autoFlex } : {}),
        ...(Array.isArray(choice.lineup) ? { lineup: choice.lineup as string[] } : {}),
        ...(choice.machine !== undefined ? { machine: choice.machine as string | null } : {}),
        ...(typeof choice.autoMachine === "boolean" ? { autoMachine: choice.autoMachine } : {}) };
}

export function selectedRaidNames(selection: RaidSelection, team: RaidTeam): string[]
{
    return selection.lineup ?? [...team.core, ...selection.flex];
}

// Legacy saves enter auto mode once; explicit manual overrides are honored.
// Re-resolve with each report so newly unlocked preferred flex replaces a fallback.
export function resolveRaidSelection(value: unknown, teams: RaidTeams, owned: Set<string>): RaidSelection
{
    const choice = value && typeof value === "object" ? value as Record<string, unknown> : null;
    // Keep the boss/core when an automatic cookie contains an obsolete flex name.
    const context = choice && (choice.autoFlex === undefined || choice.autoFlex === true)
        ? validateRaidSelection({ ...choice, flex: [], lineup: undefined, machine: undefined, autoFlex: true }, teams) : null;
    const selection = validateRaidSelection(value, teams) ?? context ?? defaultRaidSelection(teams, owned);
    const team = teams[selection.boss]![selection.teamName]!;
    const members = raidCandidates(team).map(name => ({ name, owned: owned.has(name) }));
    const suggested = suggestedRaidLineup({ ...team, members });
    const lineup = selection.autoFlex === false
        ? [...new Set([...selectedRaidNames(selection, team).filter(name => owned.has(name) && raidCandidates(team).includes(name)), ...suggested])].slice(0, 5)
        : suggested;
    const machine = selection.autoMachine === false && selection.machine && owned.has(selection.machine)
        ? selection.machine : suggestedRaidMachine(team, owned);
    return { ...selection, autoFlex: selection.autoFlex !== false, lineup, flex: lineup.filter(name => !team.core.includes(name)), machine, autoMachine: selection.autoMachine !== false };
}

export function defaultRaidSelection(teams: RaidTeams, owned: Set<string>): RaidSelection
{
    const boss = teams["Avatar of Khaine"]?.["Big Hit"] ? "Avatar of Khaine" : Object.keys(teams)[0]!;
    const teamName = teams[boss]?.["Big Hit"] ? "Big Hit" : Object.keys(teams[boss]!)[0]!;
    return resolveRaidSelection({ boss, teamName, flex: [], autoFlex: true }, teams, owned);
}
