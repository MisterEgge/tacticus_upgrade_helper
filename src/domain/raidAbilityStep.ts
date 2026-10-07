import {abilityLevelCap} from "./abilityCosts";

export function raidAbilityStep(level:number|null,target:string,xpLevel:number|null,rarity:string|null):string
{
    if(level===null||xpLevel===null||rarity===null)return "Future option · not owned";
    const first=Number.parseInt(target,10);
    if(!Number.isFinite(first))return "Target needs research";
    if(level>=first)return "At suggested first stop";
    const rarityCap=abilityLevelCap(rarity);
    if(rarityCap===null)return "Rarity cap unknown · verify in game";
    const reachable=Math.min(first,xpLevel,rarityCap);
    if(reachable>level)return `Level eligible: ${level} → ${reachable} · check badges and coins${first>reachable?` · goal ${first} needs ${xpLevel<first?"XP":""}${xpLevel<first&&rarityCap<first?" and ":""}${rarityCap<first?"rarity":""}`:""}`;
    const blocks=[...(xpLevel<=level?[`XP for level ${level+1}`]:[]),...(rarityCap<=level?[`rarity above ${rarity}`]:[])];
    return `${blocks.join(" and ")||"Progression"} needed before next ability level`;
}
