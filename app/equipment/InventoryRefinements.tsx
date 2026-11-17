"use client";
import EquipmentOpportunityGrid, { type EquipmentOpportunity } from "./EquipmentOpportunityGrid";
import {groupEquipmentShopping} from "../../src/domain/equipmentShopping";

type Slot={character:string;characterId?:string;slotId:string;minimumLevel?:number;currentItem:string;currentLevel:number;allocatedItemId?:string;acquisition:Array<{id:string;name:string}>};
export default function InventoryRefinements({slots,inventory}:{slots:Slot[];inventory:ReadonlyArray<{id:string;amount:number;level:number}>}){
 const choices=slots.flatMap(slot=>{
  const source=slot.acquisition.find(source=>source.id===slot.allocatedItemId)??slot.acquisition.find(source=>inventory.some(copy=>copy.id===source.id&&copy.amount>0&&copy.level<(slot.minimumLevel??1)));
  return source?[{slot,source:{...source,offers:[]}}]:[];
 });
 const groups=groupEquipmentShopping(choices);
 if(!groups.length)return null;
 const opportunities:EquipmentOpportunity[]=groups.map(item=>{
  const copies=inventory.filter(copy=>copy.id===item.id),owned=copies.reduce((sum,copy)=>sum+copy.amount,0);
  return {
   id:item.id,
   name:item.name,
   quantity:owned,
   quantityLabel:"owned",
   slots:[...new Set(item.members.map(({slot})=>slot.slotId))],
   recipients:item.members.map(({slot})=>({
    character:slot.character,
    ...(slot.characterId ? {characterId:slot.characterId} : {})
   })),
   action:<><strong>Refine {item.members.length} {item.members.length===1?"copy":"copies"}</strong><small>{copies.map(copy=>`${copy.amount} at level ${copy.level}`).join(" · ")} owned</small></>
  };
 });
 return <section className="equipmentShopSummary" aria-label="Refine inventory"><h2>Refine inventory</h2><p className="sub">Use copies you already own. Check coins and salvage before refining.</p>
  <EquipmentOpportunityGrid items={opportunities}/>
 </section>;
}
