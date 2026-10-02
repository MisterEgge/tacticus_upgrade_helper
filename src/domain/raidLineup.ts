import type { RaidTeam } from "./raidMeta";
type Team = RaidTeam & { members: { name: string; owned: boolean }[] };

// Prefer cited boss flex, then fill vacancies with owned source alternatives.
// Alternatives are unranked: the fallback is assembled, not a measured best five.
export function suggestedRaidFlex(_boss:string,_teamName:string,team:Team):string[]
{
    const available=new Set(team.members.filter(member=>member.owned).map(member=>member.name));
    const candidates=[...new Set([...(team.recommendation?.flex??[]),...team.flex])];
    return candidates.filter(name=>team.flex.includes(name)&&!team.core.includes(name)&&available.has(name)).slice(0,Math.max(0,5-team.core.length));
}
