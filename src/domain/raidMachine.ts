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

export function raidMythicNames(roster:readonly {id:string;name:string;rarity:string}[]):Set<string>{
    return new Set(roster.filter(unit=>unit.rarity==="Mythic").map(unit=>RAID_MACHINES.find(machine=>machine.id===unit.id)?.name??unit.name));
}

export function suggestedRaidMachine(team: RaidTeam, owned: ReadonlySet<string>, lineup:readonly string[] = [], mythic:ReadonlySet<string> = new Set()): string | null
{
    const known = new Set<string>(RAID_MACHINES.map(machine => machine.name));
    const preferred=recommendedRaidMachine(team);
    const crawlerSupport=mythic.has("Plagueburst Crawler")&&lineup.some(name=>mythic.has(name));
    const alternatives=preferred==="Plagueburst Crawler"&&!crawlerSupport
        ?["Biovore","Galatian",...(team.machine?.alternatives??[])]
        :[...(team.machine?.alternatives??[]),"Biovore"];
    return [preferred,...alternatives,...known]
        .find((name): name is string => !!name && known.has(name) && owned.has(name) && !team.excludedMachines?.includes(name)
            && (name!=="Plagueburst Crawler"||crawlerSupport)) ?? null;
}

// Conditional mechanics from the reviewed machine assessment. Map-specific casts
// still depend on a matching replay and the team's actual position.
const raidMachineTactics:Record<(typeof RAID_MACHINES)[number]["name"],string> = {
    Biovore: "Use mines for bait or positioning before the boss acts. Keep attack hexes open. Upgrade only if the mines need more health or damage for your plan. The Mythic damage bonus needs Mythic attackers and a mine hit.",
    "Plagueburst Crawler": "Raid bosses resist the armour reduction from contamination. Use the secondary to replace obstructive fire when useful. The Mythic damage bonus needs a Mythic Crawler and Mythic allies on contaminated hexes.",
    Reanimator: "Apply protocols to your Mechanical units or summons before combat. Use the primary after marked summons have attacked when a second action is useful, or when repair is needed.",
    Galatian: "Deploy where its attacks can reach the boss without blocking a melee hex. Wait until you know where the boss will stay. Deployment commits Galatian to the board.",
    Forgefiend: "Save the primary for a wave of summons it can clear. Use the secondary to put fire on the enemy approach while keeping your melee route open.",
    "Z'Kar": "Deploy beside a Psyker when there is a legal target in range. Set your formation first so nearby Psykers can follow up and the deployment hex stays clear.",
    "Malleus Rocket Launcher": "Use the secondary after its initial cooldown if Guardsmen can draw fire or support the fight. Leave space for the team to reach the boss.",
    Rukkatrukk: "Set up the friendly adjacency needed for the primary before casting. Use the secondary to mark a path enemies will actually cross.",
    "Storm Speeder": "Time Hailstrike before a ranged damage window so your attackers can use the added pierce.",
    "Tson'ji": "Apply Markerlight before a ranged damage window. The secondary hits already marked enemies before marking its chosen target.",
    Exorcist: "Use the primary to create a fire setup before your ranged attacks. Keep fire off your team's approach.",
};

export function raidMachinePlan(machine: string | null, boss: string): string {
    if (!machine) return "Choose an owned Machine of War in Team.";
    const note = RAID_MACHINES.find(option => option.name === machine);
    const tactics = note ? raidMachineTactics[note.name] : "Use the matching replay to plan placement and timing.";
    return boss === "Rogal Dorn" && machine === "Biovore"
        ? `${tactics} Check the Gunners lane before placing a mine, since summons can trigger area fire.`
        : tactics;
}
