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

/** Preserve the selected slot while filling every other slot with distinct teams. */
export function reflowWarTeamIndexes(teams:WarTeamCandidate[],slot:number,choice:number,count:number):number[]|null
{
    const chosen=teams[choice];
    if(!chosen||slot<0||slot>=count||count<1)return null;
    const names=new Set(chosen.members.map(member=>member.name));
    const remainder=teams.map((team,index)=>({team,index})).filter(({team,index})=>index!==choice&&!team.members.some(member=>names.has(member.name)));
    const picks=uniqueWarTeamIndexes(remainder.map(row=>row.team),count-1).map(index=>remainder[index]!.index);
    if(picks.length!==count-1)return null;
    let cursor=0;
    return Array.from({length:count},(_,index)=>index===slot?choice:picks[cursor++]!);
}

export function selectableWarTeamIndexes(teams:WarTeamCandidate[],count:number):Set<number>
{
    return new Set(teams.flatMap((_,index)=>reflowWarTeamIndexes(teams,0,index,count)?[index]:[]));
}
