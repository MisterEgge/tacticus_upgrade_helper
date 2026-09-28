export function abilityTargetMet(current:number|null|undefined,target:number|string|null|undefined):boolean
{
    const goal=typeof target==="number"?target:target?.match(/\d+/)?.[0];
    return current!==null&&current!==undefined&&goal!==undefined&&goal!==null&&current>=Number(goal);
}

export function formatAbilityTarget(current:number|null|undefined,target:number|string|null|undefined):string
{
    if(abilityTargetMet(current,target))return "Target met";
    if(target===null||target===undefined||target==="RESEARCHING"||target==="Research needed")return "Target needs research";
    if(current===null||current===undefined)return `Current unknown · target ${target}`;
    return `${current} → ${target}`;
}
