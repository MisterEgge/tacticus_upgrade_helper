import {equipmentCompatibility,type EquipmentCharacter,type EquipmentDefinition} from "./equipmentCompatibility";
import type {EquipmentFocus} from "./equipmentFocus";

export type ReallocationUnit={id:string;name:string;rarity:string;items:Array<{slotId:string;id:string;level:number;rarity?:string;name?:string}>};
export type ReallocationTarget={character:string;characterId:string;slotId:string;itemId:string;minimumLevel:number;inventoryReady:boolean};
export type GearRole={label:string;priority:number;donationBlocked?:true};
export type GearHolding={character:string;characterId:string;slotId:string;itemId:string;itemName:string;level:number;reason:string;rarity?:string};
export type GearTransfer=GearHolding&{recipient:string;recipientId:string;recipientSlot:string;replacesId:string;replacesName:string;replacesLevel:number;replacesRarity?:string;role:string};
export type GearReview=GearHolding&{action:string};

/** Selected teams win priority; other recorded roles still protect their equipped gear. */
export function gearRoles({raidNames,raidOptions,warNames,campaignNames,campaignUnknown,focus}:{raidNames:string[];raidOptions:string[];warNames:string[];campaignNames:string[];campaignUnknown:string[];focus:Record<string,EquipmentFocus>}) {
 const roles=new Map<string,GearRole>();
 const add=(names:string[],label:string,priority:number)=>names.forEach(name=>{if((roles.get(name)?.priority??-1)<priority)roles.set(name,{label,priority});});
 add(campaignUnknown,"Campaign progress unknown",0);
 add(raidOptions,"Raid team option",0);
 for(const [name,entry] of Object.entries(focus))if(entry.modes?.length)add([name],`Planned role: ${entry.modes.join(" / ")}`,0);
 add(Object.entries(focus).filter(([,entry])=>entry.modes?.includes("LRE")).map(([name])=>name),"Legendary Release Event",200);
 add(warNames,"Selected War team",300);
 add(campaignNames,"Required for unfinished campaign",400);
 add(raidNames,"Selected Raid team",1000);
 for(const name of campaignUnknown)roles.get(name)!.donationBlocked=true;
 return roles;
}

/** Move verified upgrades uphill and reserve each affected slot once. */
export function planLegendaryReallocation({units,targets,characters,equipment,roles,warUnknown=false}:{units:ReallocationUnit[];targets:ReallocationTarget[];characters:EquipmentCharacter[];equipment:Record<string,EquipmentDefinition>;roles:ReadonlyMap<string,GearRole>;warUnknown?:boolean}) {
 const tiers=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
 const byId=new Map(units.map(unit=>[unit.id,unit]));
 const definitions=new Map(characters.map(character=>[character.id,character]));
 const protectedGear:GearHolding[]=[],review:GearReview[]=[],available:GearHolding[]=[];
 for(const unit of units)for(const item of unit.items){
  if(!["Uncommon","Rare","Epic","Legendary"].includes(item.rarity??equipment[item.id]?.rarity??""))continue;
  const role=roles.get(unit.name);
  const holding:GearHolding={character:unit.name,characterId:unit.id,slotId:item.slotId,itemId:item.id,itemName:equipment[item.id]?.name??item.name??item.id,level:item.level,rarity:equipment[item.id]?.rarity??item.rarity??"Unknown",reason:role?.label??"No recorded Raid, War or campaign role"};
  if(role||warUnknown)protectedGear.push({...holding,reason:role?.label??"War selections unavailable — keep equipped"});
  if(warUnknown||role?.donationBlocked)continue;
  if(!equipment[item.id]||!definitions.has(unit.id)||!Number.isInteger(item.level)||item.level<1){
   if(!role)review.push({...holding,action:"Keep equipped — item or character data needs review"});
   continue;
  }
  available.push(holding);
 }
 const inventorySlots=new Set(targets.filter(target=>target.inventoryReady).map(target=>`${target.characterId}:${target.slotId}`));
 const queue=targets.filter(target=>!inventorySlots.has(`${target.characterId}:${target.slotId}`)&&(roles.get(target.character)?.priority??0)>0).sort((a,b)=>(roles.get(b.character)?.priority??0)-(roles.get(a.character)?.priority??0)||a.character.localeCompare(b.character)||a.slotId.localeCompare(b.slotId)||tiers.indexOf(equipment[b.itemId]?.rarity??"")-tiers.indexOf(equipment[a.itemId]?.rarity??"")||a.itemId.localeCompare(b.itemId));
 const transfers:GearTransfer[]=[],slots=new Set<string>();
 for(const target of queue){
  const key=`${target.characterId}:${target.slotId}`;
  const unit=byId.get(target.characterId),character=definitions.get(target.characterId),definition=equipment[target.itemId];
  const current=unit?.items.find(item=>item.slotId===target.slotId),currentDefinition=current?equipment[current.id]:undefined;
  if(slots.has(key)||!unit||unit.name!==target.character||!character||!definition||!["Uncommon","Rare","Epic","Legendary"].includes(definition.rarity)||!current||!currentDefinition||currentDefinition.type!==definition.type||current.id===target.itemId||tiers.indexOf(currentDefinition.rarity)<0||tiers.indexOf(currentDefinition.rarity)>tiers.indexOf(definition.rarity)||tiers.indexOf(unit.rarity)<tiers.indexOf(definition.rarity)||equipmentCompatibility(definition,character)!=="compatible"||!Number.isInteger(target.minimumLevel)||target.minimumLevel<1)continue;
  const recipientPriority=roles.get(unit.name)!.priority;
  const priority=(item:GearHolding)=>roles.get(item.character)?.priority??-1;
  const donor=available.filter(item=>!slots.has(`${item.characterId}:${item.slotId}`)&&item.itemId===target.itemId&&item.characterId!==unit.id&&item.level>=target.minimumLevel&&priority(item)<recipientPriority)
   .sort((a,b)=>priority(a)-priority(b)||b.level-a.level||a.character.localeCompare(b.character)||a.slotId.localeCompare(b.slotId))[0];
  if(!donor)continue;
  slots.add(key);slots.add(`${donor.characterId}:${donor.slotId}`);
  transfers.push({...donor,recipient:unit.name,recipientId:unit.id,recipientSlot:target.slotId,replacesId:current.id,replacesName:currentDefinition.name??current.name??current.id,replacesLevel:current.level,replacesRarity:currentDefinition.rarity,role:roles.get(unit.name)!.label});
 }
 const moved=new Set(transfers.map(transfer=>`${transfer.characterId}:${transfer.slotId}`));
 for(const holding of available)if(!moved.has(`${holding.characterId}:${holding.slotId}`)&&!roles.has(holding.character))review.push({...holding,action:"Keep equipped — no suitable transfer right now"});
 return {transfers,review,protectedGear:protectedGear.filter(holding=>!moved.has(`${holding.characterId}:${holding.slotId}`))};
}
