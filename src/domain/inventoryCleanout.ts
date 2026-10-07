import {equipmentCompatibility,equipmentFamily,equipmentStatsAtLevel,type EquipmentCharacter,type EquipmentDefinition} from "./equipmentCompatibility";
import {progressionRarity,CHARACTER_RARITIES} from "./characterProgression";
import {equipmentUpgradeOptions} from "./equipmentOptions";

export type CleanoutInventoryItem={id:string;name?:string;level:number;amount:number};
export type CleanoutUnit={id:string;name:string;faction?:string;progressionIndex:number;items:Array<{slotId:string;id:string;rarity?:string;level:number}>};
export type CleanoutDemand={characterId?:string;slotId?:string;recommendedItemId?:string;allocatedItemId?:string;allocatedLevel?:number};
export type CleanoutRecipient={id:string;name:string;owned:boolean;need:boolean;reason:string};
export type CleanoutStack={level:number;amount:number;keep:number;scrap:number;allocated:number};
export type CleanoutStatus="SCRAP SAFE"|"EXCESS"|"KEEP / RESERVED"|"UNKNOWN — DO NOT SCRAP"|"SITUATIONAL — REVIEW";
export type CleanoutRow={id:string;name:string;rarity:string;type:string;amount:number;keep:number;scrap:number;status:CleanoutStatus;reason:string;ownedReserve:number;futureReserve:number;futureRecipients:number;planned:number;invested:number;recipients:CleanoutRecipient[];stacks:CleanoutStack[]};

const tier=(rarity:string)=>CHARACTER_RARITIES.indexOf(rarity as typeof CHARACTER_RARITIES[number]);
const metrics:Record<string,string[]>={I_Crit:["critChance","critDamage"],I_Block:["blockChance","blockDamage"],I_Defensive:["hp","armor"],I_Booster_Crit:["critChanceBonus","critDamageBonus"],I_Booster_Block:["blockChanceBonus","blockDamageBonus"]};

/** Audit exact compatibility against a named snapshot; future reserves are optional and explicit.
 * Leveled surplus and lower-chance block alternatives require a manual decision, never automatic salvage.
 */
export function inventoryCleanout(items:CleanoutInventoryItem[],units:CleanoutUnit[],demands:CleanoutDemand[],catalog:EquipmentCharacter[],equipment:Record<string,EquipmentDefinition>,options={reserveLocked:true}):CleanoutRow[] {
 const grouped=new Map<string,CleanoutStack[]>();
 for(const item of items){
  if(!Number.isInteger(item.amount)||item.amount<=0)continue;
  const stacks=grouped.get(item.id)??[];
  const stack=stacks.find(stack=>stack.level===item.level);
  if(stack)stack.amount+=item.amount;
  else stacks.push({level:item.level,amount:item.amount,keep:0,scrap:0,allocated:0});
  grouped.set(item.id,stacks);
 }
 const owned=new Map(units.map(unit=>[unit.id,unit]));
 const uniqueDemands=[...demands.reduce((map,demand,index)=>map.set(demand.characterId&&demand.slotId?`${demand.characterId}:${demand.slotId}`:`demand:${index}`,demand),new Map<string,CleanoutDemand>()).values()];
 return [...grouped].map(([id,stacks]):CleanoutRow=>{
  stacks.sort((a,b)=>b.level-a.level);
  const planned=uniqueDemands.filter(demand=>(demand.allocatedItemId??demand.recommendedItemId)===id);
  const item=equipment[id],amount=stacks.reduce((sum,stack)=>sum+stack.amount,0);
  const row:CleanoutRow={id,name:item?.name??items.find(item=>item.id===id)?.name??id,rarity:item?.rarity??"Unknown",type:item?.type??"Unknown",amount,keep:amount,scrap:0,status:"UNKNOWN — DO NOT SCRAP",reason:"Item definition or exact compatibility is missing.",ownedReserve:0,futureReserve:0,futureRecipients:0,planned:0,invested:0,recipients:[],stacks};
  row.planned=planned.length;
  for(const demand of planned){const stack=stacks.find(stack=>stack.level===(demand.allocatedLevel??1));if(stack&&stack.allocated<stack.amount)stack.allocated++;}
  const unknown=(reason:string)=>{row.reason=reason;for(const stack of stacks)stack.keep=stack.amount;return row;};
  if(!item||tier(item.rarity)<0||!catalog.length||!equipmentFamily(id))return unknown(row.reason);
  if(stacks.some(stack=>!equipmentStatsAtLevel(item,stack.level)))return unknown("Item level stats are unavailable; do not infer a comparison from level 1.");
  const compatible=catalog.filter(character=>equipmentCompatibility(item,character)==="compatible");
  if(catalog.some(character=>equipmentCompatibility(item,character)==="unknown"))return unknown("At least one possible recipient has unresolved exact compatibility.");
  if(!compatible.length)return unknown("No compatible character is verified in the equipment source snapshot.");
  let unresolved=false;
  const best=equipmentStatsAtLevel(item,stacks[0]!.level)!;
  for(const character of compatible){
   const unit=owned.get(character.id);
   const count=character.equipment.filter(type=>type===item.type).length;
   if(!unit){row.futureRecipients+=count;row.recipients.push({id:character.id,name:character.name,owned:false,need:true,reason:"Locked character · reserve for future equipment"});continue;}
   const rarity=progressionRarity(unit.progressionIndex);
   if(!rarity){unresolved=true;row.recipients.push({id:unit.id,name:unit.name,owned:true,need:true,reason:"Unknown progression"});continue;}
   const equipped=unit.items.filter(held=>equipment[held.id]?.type===item.type);
   let needed=Math.max(0,count-equipped.length);
   const reasons:string[]=[];
   if(needed)reasons.push("Missing equipped slot");
   for(const held of equipped){
    const old=equipment[held.id],stats=equipmentStatsAtLevel(old,held.level);
    if(!old||!stats){unresolved=true;reasons.push("Equipped item stats unresolved");continue;}
    const preferred=equipmentUpgradeOptions({id:unit.id,faction:character.faction,rarity:"Mythic"},{equipment:character.equipment,traits:character.traits??[]},held,equipment).some(option=>option.id===id);
    let need=false,reason="Equipped gear already covers this option";
    if(tier(item.rarity)>tier(old.rarity)){need=true;reason=tier(item.rarity)>tier(rarity)?"Future ascension · higher-rarity equipment":"Higher-rarity equipment upgrade";}
    else if(preferred){need=true;reason=item.type==="I_Block"?"Preferred block chance · check refinement level":"Preferred health + armor";}
    else if(equipmentFamily(id)===equipmentFamily(held.id)&&tier(item.rarity)===tier(old.rarity)&&stacks[0]!.level>held.level){need=true;reason="Higher-level inventory copy";}
    else if(tier(item.rarity)>=tier(old.rarity)&&equipmentFamily(id)!==equipmentFamily(held.id)){
     const keys=metrics[item.type];
     if(!keys){unresolved=true;reason="Cross-family stats are unresolved";}
     else if(keys.some(key=>(best as Record<string,number>)[key]===undefined&&(stats as Record<string,number>)[key]===undefined)){
      // Zero hp/armor values are often omitted; these are the only safe zero defaults.
      if(item.type!=="I_Defensive"){unresolved=true;reason="Cross-family stats are incomplete";}
     }
     if(keys?.some(key=>((best as Record<string,number>)[key]??0)>((stats as Record<string,number>)[key]??0))){need=true;reason="Different item family · situational alternative";}
    }
    if(need)needed++;
    reasons.push(reason);
   }
   row.ownedReserve+=needed;
   row.recipients.push({id:unit.id,name:unit.name,owned:true,need:needed>0,reason:[...new Set(reasons)].join(" · ")||"Equipped gear already covers this option"});
  }
  if(unresolved)return unknown("Recipient progression or equipped item stats are unresolved; keep every copy pending review.");
  row.futureReserve=options.reserveLocked?row.futureRecipients:0;
  const reserve=Math.min(amount,Math.max(row.ownedReserve,row.planned)+row.futureReserve);
  // Exact planned copy levels are protected before filling the rest with the best copies.
  for(const stack of stacks)stack.keep=stack.allocated;
  let left=Math.max(0,reserve-stacks.reduce((sum,stack)=>sum+stack.keep,0));
  for(const stack of stacks){const keep=Math.min(left,stack.amount-stack.keep);stack.keep+=keep;left-=keep;}
  for(const stack of stacks){
   if(stack.level>1){row.invested+=stack.amount-stack.keep;stack.keep=stack.amount;}
   stack.scrap=stack.amount-stack.keep;
  }
  row.keep=stacks.reduce((sum,stack)=>sum+stack.keep,0);row.scrap=amount-row.keep;
  const lowBlock=item.type==="I_Block"&&(item.baseStats?.blockChance??100)<30;
  if(lowBlock){for(const stack of stacks){stack.keep=stack.amount;stack.scrap=0;}row.keep=amount;row.scrap=0;row.status="SITUATIONAL — REVIEW";row.reason="Lower block chance is not the default upgrade target, but its larger block can save a fragile character. Review manually; no automatic salvage.";return row;}
  row.status=row.scrap?(row.keep?"EXCESS":"SCRAP SAFE"):"KEEP / RESERVED";
  row.reason=[row.ownedReserve?`${row.ownedReserve} owned slot(s) may use this item`:"Owned recipients already covered",row.futureReserve?`${row.futureReserve} locked-character reserve(s)`:row.futureRecipients?`${row.futureRecipients} locked slot(s) excluded by your scope`:"No locked recipients",row.planned?`${row.planned} planned allocation(s) protected`:null,row.invested?`${row.invested} leveled surplus copies protected for manual review`:null,row.scrap?`${row.scrap} level-1 copies above these reserves`:null].filter(Boolean).join(" · ");
  return row;
 }).sort((a,b)=>b.scrap-a.scrap||a.status.localeCompare(b.status)||a.name.localeCompare(b.name));
}
