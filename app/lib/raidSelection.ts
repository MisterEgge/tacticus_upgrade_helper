import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { resolveRaidSelection, type RaidSelection, type RaidTeams } from "../../src/domain/raidSelection";
import type { Report } from "./report";

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
    return resolveRaidSelection(stored, teams, new Set(report?.roster.map(unit => unit.name) ?? []));
}
