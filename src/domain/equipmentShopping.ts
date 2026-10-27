type ShoppingSlot={character:string;characterId?:string;slotId:string};
type ShoppingSource={id:string;name:string;offers:readonly {id:string}[]};

/** A quantity is distinct recipient slots for one item option, not rows/offers. */
export function groupEquipmentShopping<S extends ShoppingSlot,I extends ShoppingSource>(choices:readonly {slot:S;source:I}[]){
 const groups=new Map<string,{id:string;name:string;members:Array<{slot:S;source:I}>;offers:I["offers"][number][]}>();
 const slots=new Map<string,Set<string>>();
 for(const choice of choices){
  const {slot,source}=choice;
  let group=groups.get(source.id);
  if(!group){group={id:source.id,name:source.name,members:[],offers:[]};groups.set(source.id,group);slots.set(source.id,new Set());}
  const key=JSON.stringify([slot.characterId??slot.character,slot.slotId]);
  if(!slots.get(source.id)!.has(key)){group.members.push(choice);slots.get(source.id)!.add(key);}
  for(const offer of source.offers)if(!group.offers.some(existing=>JSON.stringify(existing)===JSON.stringify(offer)))group.offers.push(offer);
 }
 return [...groups.values()];
}
