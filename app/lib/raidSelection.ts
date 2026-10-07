import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { resolveRaidSelection, type RaidSelection, type RaidTeams } from "../../src/domain/raidSelection";
import type { Report } from "./report";
import { RAID_MACHINES } from "../../src/domain/raidMachine";

export const RAID_SELECTION_COOKIE = "tacticus-main-raid-team";

export async function getRaidMeta(): Promise<{ _meta: { sourceUrl: string; reviewedOn: string; note: string }; bosses: RaidTeams }>
{
    return JSON.parse(await readFile("config/raid_boss_meta.json", "utf8"));
}

export async function getMainRaidSelection(teams: RaidTeams, report: Report | null): Promise<RaidSelection>
{
    const raw = (await cookies()).get(RAID_SELECTION_COOKIE)?.value;
    let stored: unknown;
    try { stored = raw ? JSON.parse(raw) : null; } catch { stored = null; }
    return resolveRaidSelection(stored, teams, ownedRaidUnits(report));
}

export function ownedRaidUnits(report: Report | null): Set<string>
{
    const machineNames = new Set<string>(RAID_MACHINES.map(machine => machine.name));
    return new Set(report?.roster.flatMap(unit => {
        const machine = RAID_MACHINES.find(machine => machine.id === unit.id);
        return machine ? [machine.name] : machineNames.has(unit.name) ? [] : [unit.name];
    }) ?? []);
}
