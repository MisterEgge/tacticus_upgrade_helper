import type {EquipmentFocus} from "./equipmentFocus";
type AbilityUse={priority:string;modes:string[]};
type ReviewedUse={confidence:string;active:AbilityUse;passive:AbilityUse};

/** Strong reviewed uses protect gear even when a character's campaign has finished. */
export function gearRoleFocus(focus:Record<string,EquipmentFocus>,guidance:Record<string,unknown>){
 const result={...focus};
 for(const [name,value] of Object.entries(guidance)){
  const guide=value as ReviewedUse|undefined;
  if(!guide||guide.confidence!=="high")continue;
  const modes=[...new Set([guide.active,guide.passive].filter(ability=>ability?.priority==="high").flatMap(ability=>ability.modes).filter(mode=>mode!=="Campaign"))];
  if(modes.length)result[name]={...result[name],modes:[...new Set([...(result[name]?.modes??[]),...modes])]};
 }
 return result;
}
