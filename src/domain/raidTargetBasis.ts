export function raidTargetBasis(modes:string[]|undefined,confidence:string|undefined):string
{
    if(confidence==="planning")return "Editorial planning target · raid stop unverified";
    if(!modes)return "Target needs research";
    return modes.includes("Guild Raid")?"Guild Raid guidance":"General target · no Guild Raid evidence";
}
