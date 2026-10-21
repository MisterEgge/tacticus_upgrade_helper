export type EquipmentFocus = { priority?: number; modes?: string[] };

export function equipmentFocusLabels(character:string,focus:Record<string,EquipmentFocus>,campaignRequired:Set<string>,raidNames?:ReadonlySet<string>):string[]
{
    const labels:string[]=[];
    const modes=focus[character]?.modes??[];
    if(raidNames?raidNames.has(character):modes.includes("Guild Raid"))labels.push("Guild Raid");
    if(modes.includes("Guild War"))labels.push("Guild War");
    if(campaignRequired.has(character))labels.push("Incomplete Campaign");
    return labels;
}

export function equipmentFocusPriority(character:string,focus:Record<string,EquipmentFocus>,campaignRequired:Set<string>,raidNames?:ReadonlySet<string>):number
{
    if(raidNames?.has(character))return 1000+(focus[character]?.priority??0);
    const labels=equipmentFocusLabels(character,focus,campaignRequired,raidNames);
    if(!labels.length)return 0;
    return focus[character]?.priority??0;
}
