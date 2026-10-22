type Stack={id:string;name?:string;level:number;amount:number};
type Target={itemId:string;itemName:string;character:string;priority:number};

/** Balance is per item, while refinement stacks remain visible for eligibility checks. */
export function inventoryBalances(stacks:Stack[],targets:Target[]) {
 const items=new Map<string,{id:string;name:string;level:number;amount:number;levels:Map<number,number>}>();
 for(const stack of stacks){
  const item=items.get(stack.id)??{id:stack.id,name:stack.name??stack.id,level:0,amount:0,levels:new Map<number,number>()};
  item.amount+=stack.amount;
  item.levels.set(stack.level,(item.levels.get(stack.level)??0)+stack.amount);
  items.set(stack.id,item);
 }
 for(const target of targets)if(!items.has(target.itemId))items.set(target.itemId,{id:target.itemId,name:target.itemName,level:0,amount:0,levels:new Map()});
 return [...items.values()].map(item=>{
  const recipients=targets.filter(target=>target.itemId===item.id).sort((a,b)=>b.priority-a.priority);
  return {...item,levels:[...item.levels].sort((a,b)=>b[0]-a[0]).map(([level,amount])=>({level,amount})),demandCount:recipients.length,net:item.amount-recipients.length,recipients,topRecipient:recipients[0]?.character??"",topPriority:recipients[0]?.priority??0};
 }).sort((a,b)=>b.topPriority-a.topPriority||a.net-b.net||a.name.localeCompare(b.name));
}
