export type WarTeamCandidate = { members: Array<{ name: string }>; used: number };
export type DefenseCore = { name:string; core:string[]; flex:Array<{name:string;used:number}>; used:number; wins:number; score:number; defense?:number };
export type BuiltDefenseTeam = {name:string;members:string[];used:number;wins:number;score:number; evidence:"core-flex"};

/** Walk the observed cores by win rate, reserving later cores before choosing flex units. */
export function buildDistinctDefenseTeams(cores:DefenseCore[],owned:Set<string>,limit=10):BuiltDefenseTeam[]
{
    const ranked=[...cores].sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used);
    const committed=new Set<string>(),result:BuiltDefenseTeam[]=[];
    for(let index=0;index<ranked.length&&result.length<limit;index++){
        const team=ranked[index]!;
        if(team.core.length!==3||new Set(team.core).size!==3||team.core.some(name=>!owned.has(name)||committed.has(name)))continue;
        const futureCores=new Set(ranked.slice(index+1).filter(other=>other.core.every(name=>owned.has(name)&&!committed.has(name))).flatMap(other=>other.core));
        const seenFlex=new Set<string>();
        const flex=team.flex.filter(member=>{
            if(!owned.has(member.name)||committed.has(member.name)||team.core.includes(member.name)||seenFlex.has(member.name))return false;
            seenFlex.add(member.name);return true;
        }).sort((a,b)=>b.used-a.used);
        const available=[...flex.filter(member=>!futureCores.has(member.name)),...flex.filter(member=>futureCores.has(member.name))];
        if(available.length<2)continue;
        const members=[...team.core,...available.slice(0,2).map(member=>member.name)];
        members.forEach(name=>committed.add(name));
        result.push({name:members.join(" / "),members,used:team.used,wins:team.wins,score:team.score,evidence:"core-flex"});
    }
    return result;
}
const hasDistinctMembers=(team:WarTeamCandidate)=>new Set(team.members.map(member=>member.name)).size===team.members.length;

export function distinctWarSlots(teams:WarTeamCandidate[],slots:number[]):boolean
{
    if(new Set(slots).size!==slots.length)return false;
    const chosen=slots.map(index=>teams[index]);
    if(chosen.some(team=>!team||!hasDistinctMembers(team)))return false;
    const members=chosen.flatMap(team=>team!.members.map(member=>member.name));
    return new Set(members).size===members.length;
}

/** Assigned teams can swap slots; unused options must not overlap the other assigned teams. */
export function warSlotChoices(teams:WarTeamCandidate[],slots:number[],slot:number)
{
    if(!distinctWarSlots(teams,slots)||slot<0||slot>=slots.length)return {assigned:[],alternatives:[]};
    const assigned=slots.map((index,assignedSlot)=>({index,slot:assignedSlot}));
    const occupied=new Set(slots.filter((_,assignedSlot)=>assignedSlot!==slot).flatMap(index=>teams[index]!.members.map(member=>member.name)));
    const alternatives=teams.flatMap((team,index)=>!slots.includes(index)&&hasDistinctMembers(team)&&team.members.every(member=>!occupied.has(member.name))?[index]:[]);
    return {assigned,alternatives};
}

/** Do not silently replace any other assigned team when comparing slot targets. */
export function chooseWarTeamForSlot(teams:WarTeamCandidate[],slots:number[],slot:number,choice:number):number[]|null
{
    if(!distinctWarSlots(teams,slots)||slot<0||slot>=slots.length||!teams[choice])return null;
    const next=[...slots],other=slots.indexOf(choice);
    if(other>=0){next[slot]=choice;next[other]=slots[slot]!;}
    else next[slot]=choice;
    return distinctWarSlots(teams,next)?next:null;
}

/** Restore saved source team names only when every team is still owned and distinct. */
export function restoreWarTeamIndexes<T extends WarTeamCandidate & {name:string}>(teams:T[],saved:unknown,count:number):number[]
{
    const defaults=uniqueWarTeamIndexes(teams,count);
    if(!Array.isArray(saved)||saved.length!==defaults.length||saved.some(name=>typeof name!=="string"))return defaults;
    const indexes=saved.map(name=>teams.findIndex(team=>team.name===name));
    if(indexes.some(index=>index<0)||new Set(indexes).size!==indexes.length||indexes.some(index=>!hasDistinctMembers(teams[index]!)))return defaults;
    const members=indexes.flatMap(index=>teams[index]!.members.map(member=>member.name));
    return new Set(members).size===members.length?indexes:defaults;
}

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
            if (!hasDistinctMembers(team) || team.members.some((member) => members.has(member.name))) continue;
            visit(index + 1, [...picks, index], new Set([...members, ...team.members.map((member) => member.name)]), used + team.used);
        }
    };
    visit(0, [], new Set(), 0);
    return best.picks;
}
