type Candidate = {
 character:string; slotId:string; state:string; itemRarity:string; accountPriority:number;
 recommendedItemId?:string; acquisition:Array<{id:string}>;
};

/** Reserve each shared copy once and offer at most one immediate replacement per slot. */
export function allocateEquipmentActions<T extends Candidate>(candidates:T[],inventory:Array<{id:string;amount:number}>)
{
 const remaining=new Map<string,number>();
 for(const item of inventory)if(Number.isInteger(item.amount)&&item.amount>0)remaining.set(item.id,(remaining.get(item.id)??0)+item.amount);
 const chosen=new Map<T,string>(),slots=new Set<string>();
 const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 const sorted=[...candidates].sort((a,b)=>Number(b.state==="EQUIP NOW")-Number(a.state==="EQUIP NOW")||b.accountPriority-a.accountPriority||a.character.localeCompare(b.character)||tiers.indexOf(b.itemRarity)-tiers.indexOf(a.itemRarity));
 for(const option of sorted){
  const key=`${option.character}:${option.slotId}`;
  if(slots.has(key)||option.state==="UNKNOWN"||option.state==="LEVEL UP")continue;
  const ids=[...new Set([...(option.recommendedItemId?[option.recommendedItemId]:[]),...option.acquisition.map(source=>source.id)])].filter(id=>option.acquisition.some(source=>source.id===id));
  const id=ids.find(id=>(remaining.get(id)??0)>0);
  if(!id)continue;
  chosen.set(option,id);slots.add(key);remaining.set(id,remaining.get(id)!-1);
 }
 return candidates.map(option=>{
  const allocatedItemId=chosen.get(option);
  const freeCopies=option.acquisition.reduce((sum,source)=>sum+(remaining.get(source.id)??0),0);
  return {...option,...(allocatedItemId?{allocatedItemId}:{}),freeCopies,state:allocatedItemId?"EQUIP NOW":option.state==="EQUIP NOW"?"NEED":option.state};
 });
}
