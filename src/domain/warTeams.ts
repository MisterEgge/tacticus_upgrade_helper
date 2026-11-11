export type WarTeamCandidate = { members: Array<{ name: string }>; used: number };
export type DefenseCore = { name:string; core:string[]; flex:Array<{name:string;used:number}>; used:number; wins:number; score:number; defense?:number };
export type BuiltDefenseTeam = {name:string;members:string[];used:number;wins:number;score:number; evidence:"core-flex"};
export type OffenseCore = { name:string; core:string[]; flex:Array<{name:string;used:number;win:number}>; used:number; wins:number };
export type BuiltOffenseTeam = {name:string;members:string[];core:string[];flex:OffenseCore["flex"];used:number;wins:number;score:number;evidence:"core-flex"};

const rate=(candidate:{win?:number;wins?:number;used:number})=>candidate.win??(candidate.used>0?(candidate.wins??0)/candidate.used*100:0);

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

/** Build distinct, owned offense suggestions from observed cores and their flex candidates. */
export function buildDistinctOffenseTeams(cores:OffenseCore[],owned:Set<string>,limit=10):BuiltOffenseTeam[]
{
    const ranked=[...cores].sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used);
    const bestFlexTeam=new Map<string,OffenseCore>();
    for(const team of ranked)for(const candidate of team.flex){
        const current=bestFlexTeam.get(candidate.name);
        if(!current||rate(candidate)>rate(current.flex.find(member=>member.name===candidate.name)!)||
            rate(candidate)===rate(current.flex.find(member=>member.name===candidate.name)!)&&candidate.used>(current.flex.find(member=>member.name===candidate.name)?.used??0))bestFlexTeam.set(candidate.name,team);
    }
    const pairsFor=(team:OffenseCore)=>
    {
        const flex=team.flex.filter((member,index)=>owned.has(member.name)&&!team.core.includes(member.name)&&bestFlexTeam.get(member.name)===team&&team.flex.findIndex(other=>other.name===member.name)===index);
        const pairs:Array<Array<OffenseCore["flex"][number]>>=[];
        for(let first=0;first<flex.length;first++)for(let second=first+1;second<flex.length;second++)pairs.push([flex[first]!,flex[second]!]);
        return pairs.sort((a,b)=>
        {
            const score=(pair:Array<OffenseCore["flex"][number]>)=>pair.reduce((total,member)=>total+rate(member),0);
            return score(b)-score(a)||b.reduce((total,member)=>total+member.used,0)-a.reduce((total,member)=>total+member.used,0);
        });
    };
    const best:BuiltOffenseTeam[]=[];
    const visit=(start:number,used:Set<string>,selected:BuiltOffenseTeam[]):boolean=>
    {
        if(selected.length>best.length)best.splice(0,best.length,...selected);
        if(selected.length>=limit)return true;
        if(start>=ranked.length||selected.length+ranked.length-start<=best.length)return false;
        for(let index=start;index<ranked.length;index++)
        {
            const team=ranked[index]!;
            if(team.core.length!==3||new Set(team.core).size!==3||team.core.some(name=>!owned.has(name)||used.has(name)))continue;
            const futureCores=new Set(ranked.slice(index+1).filter(other=>other.core.length===3&&other.core.every(name=>owned.has(name)&&!used.has(name))).flatMap(other=>other.core));
            const pairs=pairsFor(team).sort((a,b)=>
            {
                const futureCount=(pair:Array<OffenseCore["flex"][number]>)=>pair.filter(member=>futureCores.has(member.name)).length;
                return futureCount(a)-futureCount(b);
            });
            for(const pair of pairs)
            {
                const members=[...team.core,...pair.map(member=>member.name)];
                if(members.some(name=>used.has(name))||new Set(members).size!==5)continue;
                const next=[...selected,{name:team.name,members,core:[...team.core],flex:team.flex.filter(member=>owned.has(member.name)&&!team.core.includes(member.name)&&bestFlexTeam.get(member.name)===team),used:team.used,wins:team.wins,score:team.wins/team.used*1000,evidence:"core-flex" as const}];
                if(visit(index+1,new Set([...used,...members]),next))return true;
            }
        }
        return false;
    };
    visit(0,new Set(),[]);
    return best;
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

/** Reorder two assigned slots; Gold/Silver tier is determined by the destination slot. */
export function swapWarTeamSlots(slots:Array<number|null>,from:number,to:number):Array<number|null>|null
{
    const assigned=slots.filter((slot):slot is number=>slot!==null);
    if(from<0||to<0||from>=slots.length||to>=slots.length||from===to||new Set(assigned).size!==assigned.length)return null;
    const next=[...slots];
    [next[from],next[to]]=[next[to]!,next[from]!];
    return next;
}

/** Restore saved source team names only when every team is still owned and distinct. */
export function restoreWarTeamIndexes<T extends WarTeamCandidate & {name:string}>(teams:T[],saved:unknown,count:number,preferredIndexes:number[]=[]):number[]
{
    const defaults=uniqueWarTeamIndexes(teams,count,preferredIndexes);
    if(!Array.isArray(saved)||saved.length!==defaults.length||saved.some(name=>typeof name!=="string"))return defaults;
    const indexes=saved.map(name=>teams.findIndex(team=>team.name===name));
    if(indexes.some(index=>index<0)||new Set(indexes).size!==indexes.length||indexes.some(index=>!hasDistinctMembers(teams[index]!)))return defaults;
    const members=indexes.flatMap(index=>teams[index]!.members.map(member=>member.name));
    return new Set(members).size===members.length?indexes:defaults;
}

/** Choose the highest-observed set of distinct teams; a character can appear once. */
export function uniqueWarTeamIndexes(teams: WarTeamCandidate[], count: number, preferredIndexes:number[]=[]): number[]
{
    if(preferredIndexes.length)
    {
        const picks:number[]=[],members=new Set<string>();
        for(const index of [...preferredIndexes,...teams.map((_,teamIndex)=>teamIndex)])
        {
            const team=teams[index];
            if(picks.length>=count||picks.includes(index)||!team||!hasDistinctMembers(team)||team.members.some(member=>members.has(member.name)))continue;
            picks.push(index);
            team.members.forEach(member=>members.add(member.name));
        }
        if(picks.length)return picks;
    }
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
