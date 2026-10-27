type Candidate = {
 character:string; slotId:string; state:string; itemRarity:string; accountPriority:number;
 recommendedItemId?:string; acquisition:Array<{id:string}>;
 minimumLevel?:number;
 raidPriority?:boolean;
};

/** Reserve each shared copy once and offer at most one immediate replacement per slot. */
export function allocateEquipmentActions<T extends Candidate>(candidates:T[],inventory:Array<{id:string;amount:number;level?:number}>)
{
 const remaining=inventory.filter(item=>Number.isSafeInteger(item.amount)&&item.amount>0&&(item.level===undefined||Number.isSafeInteger(item.level)&&item.level>=1)).map(item=>({...item,level:item.level??1})).sort((a,b)=>b.level-a.level);
 const chosen=new Map<T,{id:string;level:number}>(),refinements=new Map<T,{id:string;level:number}>(),slots=new Set<string>();
 const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 const sorted=[...candidates].sort((a,b)=>Number(!!b.raidPriority)-Number(!!a.raidPriority)||Number(b.state==="EQUIP NOW")-Number(a.state==="EQUIP NOW")||b.accountPriority-a.accountPriority||a.character.localeCompare(b.character)||tiers.indexOf(b.itemRarity)-tiers.indexOf(a.itemRarity));
 for(const option of sorted){
  const key=`${option.character}:${option.slotId}`;
  if(slots.has(key)||option.state==="UNKNOWN"||option.state==="LEVEL UP")continue;
  const ids=[...new Set([...(option.recommendedItemId?[option.recommendedItemId]:[]),...option.acquisition.map(source=>source.id)])].filter(id=>option.acquisition.some(source=>source.id===id));
  const copy=remaining.find(item=>ids.includes(item.id)&&item.amount>0&&item.level>=(option.minimumLevel??1));
  if(!copy)continue;
  chosen.set(option,{id:copy.id,level:copy.level});slots.add(key);copy.amount--;
 }
 // Reserve unrefined copies once too: nine owned copies are not nine copies
 // that every recipient independently needs to refine.
 for(const option of sorted){
  const key=`${option.character}:${option.slotId}`;
  if(slots.has(key)||option.state==="UNKNOWN"||option.state==="LEVEL UP")continue;
  const ids=option.acquisition.map(source=>source.id);
  const copy=remaining.find(item=>ids.includes(item.id)&&item.amount>0&&item.level<(option.minimumLevel??1));
  if(!copy)continue;
  refinements.set(option,{id:copy.id,level:copy.level});slots.add(key);copy.amount--;
 }
 return candidates.map(option=>{
  const ready=chosen.get(option),refinement=refinements.get(option),copy=ready??refinement,ids=new Set(option.acquisition.map(source=>source.id));
  const freeCopies=remaining.filter(item=>ids.has(item.id)&&item.level>=(option.minimumLevel??1)).reduce((sum,item)=>sum+item.amount,0);
  const copiesToLevel=refinement?1:0;
  return {...option,...(copy?{allocatedItemId:copy.id,allocatedLevel:copy.level}:{}),freeCopies,copiesToLevel,state:ready?"EQUIP NOW":refinement?"LEVEL INVENTORY":["EQUIP NOW","LEVEL INVENTORY"].includes(option.state)?"NEED":option.state};
 });
}
