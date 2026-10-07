import type { RaidTeam } from "./raidMeta";

// Stable official unit IDs, kept separate from the deployable character catalog.
export const RAID_MACHINES = [
    { id: "tyranBiovore", name: "Biovore" },
    { id: "ultraDreadnought", name: "Galatian" },
    { id: "blackForgefiend", name: "Forgefiend" },
    { id: "deathCrawler", name: "Plagueburst Crawler" },
    { id: "necroReanimator", name: "Reanimator" },
    { id: "thousDaemonPrince", name: "Z'Kar" },
    { id: "astraOrdnanceBattery", name: "Malleus Rocket Launcher" },
    { id: "orksRukkatrukk", name: "Rukkatrukk" },
    { id: "darkaStormSpeeder", name: "Storm Speeder" },
    { id: "tauBroadside", name: "Tson'ji" },
    { id: "adeptExorcist", name: "Exorcist" }
] as const;

export function recommendedRaidMachine(team: RaidTeam): string | undefined
{
    return team.machine?.name ?? team.recommendation?.machine;
}

export function suggestedRaidMachine(team: RaidTeam, owned: Set<string>): string | null
{
    const known = new Set<string>(RAID_MACHINES.map(machine => machine.name));
    return [recommendedRaidMachine(team), ...(team.machine?.alternatives ?? []), "Biovore", ...known]
        .find((name): name is string => !!name && known.has(name) && owned.has(name) && !team.excludedMachines?.includes(name)) ?? null;
}
