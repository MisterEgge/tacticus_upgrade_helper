export const equipmentTargetRarities=["Uncommon","Rare","Epic","Legendary"] as const;
export type EquipmentTargetRarity=typeof equipmentTargetRarities[number];
const codes:Record<string,string>={Common:"C",Uncommon:"U",Rare:"R",Epic:"E",Legendary:"L"};
const order=["Common",...equipmentTargetRarities];

export function tierUpgradeItemId(currentRarity:string,currentItemId:string|undefined,target:EquipmentTargetRarity,equipment:Record<string,{type:string;rarity:string}>):string|null
{
    if(!currentItemId||order.indexOf(currentRarity)<0||order.indexOf(target)<=order.indexOf(currentRarity))return null;
    const suffix=new RegExp(`_${codes[currentRarity]}(\\d{3})$`);
    if(!suffix.test(currentItemId))return null;
    const next=currentItemId.replace(suffix,`_${codes[target]}$1`);
    const current=equipment[currentItemId],candidate=equipment[next];
    return current&&candidate&&current.type===candidate.type&&candidate.rarity===target?next:null;
}
