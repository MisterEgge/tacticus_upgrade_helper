export type WarTeamCandidate = { members: Array<{ name: string }>; used: number };

/** Choose the highest-observed set of distinct teams; a character can appear once. */
export function uniqueWarTeamIndexes(teams: WarTeamCandidate[], count: number): number[]
{
    let best: { picks: number[]; used: number } = { picks: [], used: -1 };
    const visit = (start: number, picks: number[], members: Set<string>, used: number) =>
    {
        if (picks.length > best.picks.length || picks.length === best.picks.length && used > best.used) best = { picks, used };
        if (picks.length === count) return;
        for (let index = start; index < teams.length; index++)
        {
            const team = teams[index]!;
            if (team.members.some((member) => members.has(member.name))) continue;
            visit(index + 1, [...picks, index], new Set([...members, ...team.members.map((member) => member.name)]), used + team.used);
        }
    };
    visit(0, [], new Set(), 0);
    return best.picks;
}
