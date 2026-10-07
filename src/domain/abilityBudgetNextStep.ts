import {abilityLevelCap,abilityRarityForLevel} from "./abilityCosts";
export function abilityBudgetNextStep(row:{activeLevel:number|null;passiveLevel:number|null;activeTarget:number;passiveTarget:number;xpLevel:number;rarity:string}):string
{
 if(row.activeLevel===null||row.passiveLevel===null)return "Sync ability levels";
 const remaining=[{name:"Active",current:row.activeLevel,target:row.activeTarget},{name:"Passive",current:row.passiveLevel,target:row.passiveTarget}].filter(ability=>ability.current<ability.target);
 if(!remaining.length)return "Target met";
 const cap=abilityLevelCap(row.rarity);if(!cap)return "Rarity needs review";
 const reachable=Math.min(row.xpLevel,cap);
 const steps=remaining.filter(ability=>ability.current<Math.min(reachable,ability.target)).map(ability=>`${ability.name} to ${Math.min(reachable,ability.target)}`);
 if(steps.length)return steps.join(" · ");
 const next=Math.min(...remaining.map(ability=>ability.current+1));
 const gates:string[]=[];
 if(cap<next){const rarity=abilityRarityForLevel(next);gates.push(rarity?`Ascend to ${rarity}`:"Rarity needs review");}
 if(row.xpLevel<next)gates.push(`Level character to ${next}`);
 return gates.join(" · ")||"Target needs review";
}
