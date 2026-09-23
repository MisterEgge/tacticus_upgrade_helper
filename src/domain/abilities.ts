import type { CatalogCharacter, CharacterAbilityGuidance } from "../../app/lib/catalog";
import type { RosterUnit } from "../../app/lib/report";

export function formatAbilityName(value:string)
{

    return value.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();

}

export function targetLevel(value:string, fallback=35)
{

    return Number(value.match(/\d+/)?.[0] ?? fallback);

}

export function abilityUpgradePlan(rows:AbilityGuideRow[], priorities:Record<string,{priority:number;modes?:string[]}>, goals:string[])
{

    return rows.filter(row =>
    {

        const modes=priorities[row.character]?.modes??[];
        return row.owned && goals.some(goal => modes.includes(goal)) && ((row.activeLevel??Infinity)<row.activeTargetLevel||(row.passiveLevel??Infinity)<row.passiveTargetLevel);

    }).map(row =>
    {

        const activeGap=Math.max(0,row.activeTargetLevel-(row.activeLevel??row.activeTargetLevel));
        const passiveGap=Math.max(0,row.passiveTargetLevel-(row.passiveLevel??row.passiveTargetLevel));
        const next=activeGap>=passiveGap?{name:formatAbilityName(row.activeId),level:row.activeLevel,target:row.activeTargetLevel}:{name:formatAbilityName(row.passiveId),level:row.passiveLevel,target:row.passiveTargetLevel};
        return {...row,modes:priorities[row.character]?.modes??[],next,rank:priorities[row.character]?.priority??0};

    }).sort((a,b)=>b.rank-a.rank||b.next.target-(b.next.level??b.next.target)||a.character.localeCompare(b.character));

}

export type CommunityPriority={score:number;teams:string[]};
const abilityWeight:Record<string,number>={max:6,high:5,medium:4,situational:3,low:2};
export function abilityActionQueue(rows:AbilityGuideRow[],priorities:Record<string,{priority:number;modes?:string[]}>,community:Record<string,CommunityPriority>)
{

    return rows.filter(row=>row.owned&&row.reviewed).flatMap(row=>
    {

        const options=[{ability:"Active",name:formatAbilityName(row.activeId),level:row.activeLevel,target:row.activeTargetLevel,weight:abilityWeight[row.activePriority]??1},{ability:"Passive",name:formatAbilityName(row.passiveId),level:row.passiveLevel,target:row.passiveTargetLevel,weight:abilityWeight[row.passivePriority]??1}].filter(option=>(option.level??Infinity)<option.target);
        if(!options.length)return[];
        const next=options.sort((a,b)=>b.weight-a.weight||b.target-(b.level??b.target))[0]!;
        const source=community[row.character];const account=priorities[row.character]?.priority??0;const score=(source?.score??0)*20+account+next.weight*3;
        return[{...row,next,communityScore:source?.score??null,communityTeams:source?.teams??[],score}];

    }).sort((a,b)=>b.score-a.score||b.next.weight-a.next.weight||a.character.localeCompare(b.character));

}

export function abilityGuideRows(catalog: CatalogCharacter[], roster: RosterUnit[] | null, guidance: Record<string, unknown>, priorities: Record<string, { priority: number }>)
{

    const owned = new Map(roster?.map(u => [u.id, u]) ?? []);
    return catalog.map(character =>
    {

        const unit = owned.get(character.id);
        const candidate = guidance[character.name] as Partial<CharacterAbilityGuidance> | undefined;
        const reviewed = !!candidate?.active?.practical && !!candidate?.passive?.practical && !!candidate?.confidence && !["unreviewed", "researching", "baseline-only"].includes(candidate.confidence.toLowerCase());
        const g = reviewed ? candidate as CharacterAbilityGuidance : undefined;
        const activeLevel = unit?.abilities[0]?.level ?? null;
        const passiveLevel = unit?.abilities[1]?.level ?? null;
        return {
            id: character.id, icon: character.icon, character: character.name, faction: character.faction,
            owned: roster === null ? null : !!unit,
            activeId: character.activeAbilityId ?? unit?.abilities[0]?.id ?? "Unknown ability",
            passiveId: character.passiveAbilityIds ?? unit?.abilities[1]?.id ?? "Unknown ability",
            activeLevel, passiveLevel,
            activeTargetLevel: targetLevel(g?.active.practical ?? "", 35),
            passiveTargetLevel: targetLevel(g?.passive.practical ?? "", 35),
            activeTo17: activeLevel !== null && activeLevel > 0 && activeLevel < 17,
            passiveTo17: passiveLevel !== null && passiveLevel > 0 && passiveLevel < 17,
            accountPriority: priorities[character.name]?.priority ?? 0,
            focus: g?.active.priority ?? "General baseline",activePriority:g?.active.priority??"General baseline",passivePriority:g?.passive.priority??"General baseline",
            basis: g?.active.note ?? "Use level 17 as the account baseline. Level 35 is the usual general stop; 44–50 is reserved for a deliberate high-investment build.",
            communityActiveTarget: g?.active.practical ?? "17 baseline · 35 general stop",
            communityPassiveTarget: g?.passive.practical ?? "17 baseline · 35 general stop",
            targetConfidence: g?.confidence ?? "general planning baseline — character research pending",
            activeHigh: g?.active.high ?? "44–50 high investment", passiveHigh: g?.passive.high ?? "44–50 high investment",
            reviewed
        };

    });

}

export type AbilityGuideRow = ReturnType<typeof abilityGuideRows>[number];
