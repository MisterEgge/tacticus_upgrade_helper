import type { RaidTeam } from "./raidMeta";
type Team = RaidTeam & { members: { name: string; owned: boolean }[] };

export function raidCandidates(team: RaidTeam): string[]
{
    return [...new Set([...team.core, ...team.flex, ...(team.fallbacks ?? [])])].filter(name => !team.excluded?.includes(name));
}

// Keep the owned core and cited flex first, then fill missing core/empty slots.
// Fallback order is an account planning preference, not a measured meta ranking.
export function suggestedRaidLineup(team: Team): string[]
{
    const owned = new Set(team.members.filter(member => member.owned).map(member => member.name));
    const allowed = new Set(raidCandidates(team));
    return [...new Set([...team.core, ...(team.recommendation?.flex ?? []), ...team.flex, ...(team.fallbacks ?? [])])]
        .filter(name => owned.has(name) && allowed.has(name)).slice(0, 5);
}
