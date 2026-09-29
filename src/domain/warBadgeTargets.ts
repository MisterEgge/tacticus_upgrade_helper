import { restoreWarTeamIndexes, type WarTeamCandidate } from "./warTeams";

export const WAR_PLAN_STORAGE_KEY="tacticus-war-plan-v1";
export type WarBadgeTeam=WarTeamCandidate & {name:string};
export type WarBudgetScope="war-defense"|"war-offense"|"war-both";

/** Use the selected slots, falling back to valid defaults when saved names are stale. */
export function warBadgeTargets(defense:WarBadgeTeam[],offense:WarBadgeTeam[],saved:unknown,scope:WarBudgetScope):Map<string,number>
{
    const plan=saved&&typeof saved==="object"?saved as Record<string,unknown>:{};
    const targets=new Map<string,number>();
    const add=(team:WarBadgeTeam,level:number)=>{
        for(const member of team.members)targets.set(member.name,Math.max(level,targets.get(member.name)??0));
    };
    if(scope!=="war-offense")restoreWarTeamIndexes(defense,plan.defense,5).forEach((choice,slot)=>add(defense[choice]!,slot<2?35:26));
    if(scope!=="war-defense"){
        const tiers=Array.isArray(plan.offenseTiers)&&plan.offenseTiers.length===10&&plan.offenseTiers.every(tier=>tier==="gold"||tier==="silver")?plan.offenseTiers:[];
        restoreWarTeamIndexes(offense,plan.offense,10).forEach((choice,slot)=>add(offense[choice]!,tiers[slot]==="gold"?35:26));
    }
    return targets;
}
