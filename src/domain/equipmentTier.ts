export function epicUpgradeItemId(currentRarity:string,currentItemId:string|undefined):string|null
{
    if(!currentItemId||["Epic","Legendary","Mythic"].includes(currentRarity))return null;
    const epic=currentItemId.replace(/_[CUR](\d{3})$/,"_E$1");
    return epic!==currentItemId?epic:null;
}
