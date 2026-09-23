export type ReallocationNeed={character:string;characterId:string;slotId:string;itemId:string;itemName:string};
export type ReallocationUnit={id:string;name:string;items:Array<{slotId:string;id:string;level:number;rarity?:string}>};
export type ReallocationProtection="Campaign-required character — keep protected"|"Has unmet Legendary gear targets — keep protected"|`Core account mode: ${string} — keep protected`|"Role has not been reviewed — manual decision required";
export type ReallocationDonor={character:string;characterId:string;slotId:string;level:number;protection:ReallocationProtection};
export type ReallocationResult=ReallocationNeed&{donors:ReallocationDonor[]};
export type LegendaryOpportunity={character:string;characterId:string;slotId:string;itemId:string;level:number;reason:"No active account role"|"Low-priority account role"};

/** Only reports holders; compatibility and the actual recipient remain explicit evidence requirements. */
export function legendaryOpportunityAudit(units:ReallocationUnit[],focus:Record<string,{priority?:number;modes?:string[]}>,campaignRequired:Set<string>):LegendaryOpportunity[]
{
    return units.flatMap(unit=>
    {
        if(campaignRequired.has(unit.name)||(focus[unit.name]?.modes??[]).length)return [];
        const priority=focus[unit.name]?.priority??0;
        const reason:LegendaryOpportunity["reason"]=priority>0?"Low-priority account role":"No active account role";
        return unit.items.filter(item=>item.rarity?.toLowerCase()==="legendary").map(item=>({character:unit.name,characterId:unit.id,slotId:item.slotId,itemId:item.id,level:item.level,reason}));
    });
}

export function legendaryReallocationAudit(needs:ReallocationNeed[],units:ReallocationUnit[],focus:Record<string,{modes?:string[]}>,campaignRequired:Set<string>):ReallocationResult[]
{
    const needy=new Set(needs.map(need=>need.character));
    const protectionFor=(unit:ReallocationUnit):ReallocationProtection=>
    {
        if(campaignRequired.has(unit.name))return "Campaign-required character — keep protected";
        if(needy.has(unit.name))return "Has unmet Legendary gear targets — keep protected";
        const modes=focus[unit.name]?.modes??[];
        return modes.length?`Core account mode: ${modes.join(" / ")} — keep protected`:"Role has not been reviewed — manual decision required";
    };
    return needs.map(need=>({...need,donors:units.flatMap(unit=>unit.items.filter(item=>item.id===need.itemId&&unit.name!==need.character).map(item=>({character:unit.name,characterId:unit.id,slotId:item.slotId,level:item.level,protection:protectionFor(unit)})))}));
}
