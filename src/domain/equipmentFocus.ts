export type EquipmentFocus = { priority?: number; modes?: string[] };

export function equipmentFocusLabels(character:string,focus:Record<string,EquipmentFocus>,campaignRequired:Set<string>):string[]
{
    const labels:string[]=[];
    const modes=focus[character]?.modes??[];
    if(modes.includes("Guild Raid"))labels.push("Guild Raid");
    if(modes.includes("Guild War"))labels.push("Guild War");
    if(campaignRequired.has(character))labels.push("Incomplete Campaign");
    return labels;
}

export function equipmentFocusPriority(character:string,focus:Record<string,EquipmentFocus>,campaignRequired:Set<string>):number
{
    const labels=equipmentFocusLabels(character,focus,campaignRequired);
    if(!labels.length)return 0;
    return focus[character]?.priority??0;
}
