import priorities from "../../config/character_priorities.json";
import {equipmentUpgradeOptions,preferredEquipmentItemId} from "../../src/domain/equipmentOptions";
import {allocateEquipmentActions} from "../../src/domain/equipmentActions";
import {minimumBlockReplacementLevel} from "../../src/domain/blockEquipment";
import {equipmentStatsAtLevel} from "../../src/domain/equipmentCompatibility";
import {sourcesForItem,equipmentOffersForItem,type ShopCatalog} from "../../src/domain/shops";
import {targetName,type Report} from "./report";
import type {CatalogCharacter} from "./catalog";

/** One replacement and inventory allocation model for Equipment and character details. */
export function buildEquipmentPlan(report:Report,catalog:{characters:CatalogCharacter[]},shops:ShopCatalog|null)
{
 const unitByName=new Map(report.roster.map(unit=>[unit.name,unit]));
 const catalogByName=new Map(catalog.characters.map(character=>[character.name,character]));
 const preferred=(name:string,rarity:string,currentId:string)=>{const unit=unitByName.get(name),character=catalogByName.get(name);return unit&&character&&shops?preferredEquipmentItemId(unit,character.traits,character.equipment,rarity,currentId,shops.equipment):null;};
 const ownedRoster=report.roster.filter(unit=>catalogByName.has(unit.name));
 const priority=(name:string)=>(priorities as Record<string,{priority:number}>)[name]?.priority??0;
 const inventory=new Map<string,number>();for(const item of report.unequippedInventory)inventory.set(item.id,(inventory.get(item.id)??0)+item.amount);
 const all=[...report.equipmentAllocation.equipNow.map(row=>({...row,state:"EQUIP NOW",target:targetName(row)})),...report.equipmentAllocation.buyWatch.map(row=>({...row,state:"NEED",target:targetName(row)})),...report.equipmentAllocation.compatibilityUnknown.map(row=>({...row,state:"UNKNOWN",target:targetName(row)}))];
 const slots=all.filter(row=>ownedRoster.some(unit=>unit.name===row.character)).map(row=>
 {
   const current=unitByName.get(row.character)?.items.find(item=>item.slotId===row.slotId);
   const better=row.slotId==="Slot2"&&current?preferred(row.character,"Legendary",current.id):null;
   const ids=better?[better]:[...new Set(row.recommendedItemId?[row.recommendedItemId]:row.preferredLegendaryItemIds??[])];
   const changed=better&&row.recommendedItemId!==better;
   return {...row,...(better?{target:shops!.equipment[better]!.name}:{}),...(changed&&row.state==="EQUIP NOW"?{state:inventory.get(better!)?"IN INVENTORY · allocation not assigned":"NEED"}:{}),itemRarity:"Legendary" as const,reason:better?shops!.equipment[better]!.type==="I_Block"?"Preferred block chance · general reliability":"Preferred health + armor":"Rarity upgrade",acquisition:ids.map(id=>({id,name:shops?.equipment[id]?.name??id,shops:shops?sourcesForItem(id,shops):[],offers:shops?equipmentOffersForItem(id,shops,report.source.powerLevel):[]})),available:ids.reduce((total,id)=>total+(inventory.get(id)??0),0),holders:report.roster.flatMap(unit=>unit.items.filter(item=>ids.includes(item.id)&&unit.name!==row.character).map(item=>({character:unit.name,characterId:unit.id,slotId:item.slotId,level:item.level})))};
 });
 const catalogEquipment=shops?.equipment??{};
 const genericSlots=ownedRoster.flatMap(unit=>unit.items.flatMap(item=>equipmentUpgradeOptions(unit,catalogByName.get(unit.name)??{traits:[],equipment:[]},item,catalogEquipment).flatMap(({id,rarity:itemRarity,reason})=>
 {
   const available=inventory.get(id)??0;
   return [{character:unit.name,characterId:unit.id,slotId:item.slotId,currentItem:item.name??item.id,currentRarity:item.rarity??"Unknown",currentLevel:item.level,accountPriority:priority(unit.name),itemRarity,reason,target:catalogEquipment[id]!.name,state:available?"IN INVENTORY · allocation not assigned":"NEED",acquisition:[{id,name:catalogEquipment[id]!.name,shops:shops?sourcesForItem(id,shops):[],offers:shops?equipmentOffersForItem(id,shops,report.source.powerLevel):[]}],available,holders:report.roster.flatMap(holder=>holder.items.filter(held=>held.id===id&&holder.id!==unit.id).map(held=>({character:holder.name,characterId:holder.id,slotId:held.slotId,level:held.level})))}];
 })));
 const levelSlots=ownedRoster.flatMap(unit=>unit.items.flatMap(item=>[{rarity:"Rare" as const,level:7},{rarity:"Epic" as const,level:9}].flatMap(goal=>item.rarity===goal.rarity&&item.level<goal.level&&!preferred(unit.name,goal.rarity,item.id)?[{character:unit.name,characterId:unit.id,slotId:item.slotId,currentItem:item.name??item.id,currentRarity:item.rarity,currentLevel:item.level,accountPriority:priority(unit.name),itemRarity:goal.rarity,target:`${item.name??item.id} · level ${goal.level}`,state:"LEVEL UP",acquisition:[],available:0,holders:[]}]:[])));
 const tieredSlots=[...slots,...levelSlots,...genericSlots.filter(option=>!slots.some(slot=>slot.characterId===option.characterId&&slot.slotId===option.slotId&&slot.itemRarity===option.itemRarity))];
 const candidates=tieredSlots.map(slot=>{
  const unit=unitByName.get(slot.character),current=unit?.items.find(item=>item.slotId===slot.slotId),target=slot.acquisition[0]?.id;
  const booster=unit?.items.find(item=>catalogEquipment[item.id]?.type==="I_Booster_Block");
  const bonus=booster?equipmentStatsAtLevel(catalogEquipment[booster.id],booster.level):null;
  const minimumLevel=current&&target&&catalogEquipment[current.id]?.type==="I_Block"&&current.id!==target?(booster&&!bonus?null:minimumBlockReplacementLevel(current,target,catalogEquipment,{chance:bonus?.blockChanceBonus??0,damage:bonus?.blockDamageBonus??0})):1;
  return {...slot,minimumLevel:minimumLevel??1,...(minimumLevel===null?{state:"UNKNOWN"}:{}),reason:"reason" in slot?slot.reason:catalogEquipment[target??""]?.type==="I_Block"?"Preferred block chance · general reliability":"Rarity upgrade"};
 });
 const assigned=allocateEquipmentActions(candidates,report.unequippedInventory).map(slot=>({...slot,target:slot.acquisition.find(source=>source.id===slot.allocatedItemId)?.name??slot.target}));
 const occupied=new Set(assigned.filter(slot=>slot.state==="EQUIP NOW").map(slot=>`${slot.character}:${slot.slotId}`));
 const actionable=assigned.filter(slot=>slot.state!=="LEVEL UP"||!occupied.has(`${slot.character}:${slot.slotId}`));
 const rows=ownedRoster.map(unit=>({character:unit.name,characterId:unit.id,rarity:unit.rarity,slots:actionable.filter(slot=>slot.character===unit.name)}));
 return {rows,tieredSlots:actionable,catalogEquipment,unitByName,catalogByName,inventory};
}
