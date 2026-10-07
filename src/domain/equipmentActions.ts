type Candidate = {
 character:string; slotId:string; state:string; itemRarity:string; accountPriority:number;
 recommendedItemId?:string; acquisition:Array<{id:string}>;
 minimumLevel?:number;
};

/** Reserve each shared copy once and offer at most one immediate replacement per slot. */
export function allocateEquipmentActions<T extends Candidate>(candidates:T[],inventory:Array<{id:string;amount:number;level?:number}>)
{
 const remaining=inventory.filter(item=>Number.isInteger(item.amount)&&item.amount>0).map(item=>({...item,level:item.level??1})).sort((a,b)=>b.level-a.level);
 const chosen=new Map<T,{id:string;level:number}>(),slots=new Set<string>();
 const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 const sorted=[...candidates].sort((a,b)=>Number(b.state==="EQUIP NOW")-Number(a.state==="EQUIP NOW")||b.accountPriority-a.accountPriority||a.character.localeCompare(b.character)||tiers.indexOf(b.itemRarity)-tiers.indexOf(a.itemRarity));
 for(const option of sorted){
  const key=`${option.character}:${option.slotId}`;
  if(slots.has(key)||option.state==="UNKNOWN"||option.state==="LEVEL UP")continue;
  const ids=[...new Set([...(option.recommendedItemId?[option.recommendedItemId]:[]),...option.acquisition.map(source=>source.id)])].filter(id=>option.acquisition.some(source=>source.id===id));
  const copy=remaining.find(item=>ids.includes(item.id)&&item.amount>0&&item.level>=(option.minimumLevel??1));
  if(!copy)continue;
  chosen.set(option,{id:copy.id,level:copy.level});slots.add(key);copy.amount--;
 }
 return candidates.map(option=>{
  const copy=chosen.get(option),ids=new Set(option.acquisition.map(source=>source.id));
  const freeCopies=remaining.filter(item=>ids.has(item.id)&&item.level>=(option.minimumLevel??1)).reduce((sum,item)=>sum+item.amount,0);
  const copiesToLevel=remaining.filter(item=>ids.has(item.id)&&item.level<(option.minimumLevel??1)).reduce((sum,item)=>sum+item.amount,0);
  return {...option,...(copy?{allocatedItemId:copy.id,allocatedLevel:copy.level}:{}),freeCopies,copiesToLevel,state:copy?"EQUIP NOW":copiesToLevel>0&&option.state!=="UNKNOWN"?"LEVEL INVENTORY":option.state==="EQUIP NOW"?"NEED":option.state};
 });
}
