"use client";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import EquipmentSlot from "../components/EquipmentSlot";
import ResourceName from "../components/ResourceName";
import {groupEquipmentShopping} from "../../src/domain/equipmentShopping";

type Slot={character:string;characterId?:string;slotId:string;minimumLevel?:number;currentItem:string;currentLevel:number;allocatedItemId?:string;acquisition:Array<{id:string;name:string}>};
export default function InventoryRefinements({slots,inventory}:{slots:Slot[];inventory:ReadonlyArray<{id:string;amount:number;level:number}>}){
 const choices=slots.flatMap(slot=>{
  const source=slot.acquisition.find(source=>source.id===slot.allocatedItemId)??slot.acquisition.find(source=>inventory.some(copy=>copy.id===source.id&&copy.amount>0&&copy.level<(slot.minimumLevel??1)));
  return source?[{slot,source:{...source,offers:[]}}]:[];
 });
 const groups=groupEquipmentShopping(choices);
 if(!groups.length)return null;
 return <section className="equipmentShopSummary" aria-label="Refine inventory"><h2>Refine inventory</h2><p className="sub">Use copies you already own. Check coins and salvage before refining.</p>
  <div className="tableWrap equipmentShoppingList"><table><thead><tr><th>Item</th><th title="Owned copies">Have</th><th>Action</th></tr></thead><tbody>{groups.map(item=>{
   const copies=inventory.filter(copy=>copy.id===item.id),owned=copies.reduce((sum,copy)=>sum+copy.amount,0);
   return <tr key={item.id}><td><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.id)}`}><ResourceName id={item.id} name={item.name}/></Link><small>{copies.map(copy=>`${copy.amount} at level ${copy.level}`).join(" / ")}</small></td><td className="equipmentShoppingQuantity"><strong>{owned}</strong></td><td><strong>Refine {item.members.length} {item.members.length===1?"copy":"copies"}</strong>
    <details><summary>Who needs it</summary><ul className="equipmentShoppingRecipients">{item.members.map(({slot})=><li key={`${slot.characterId??slot.character}:${slot.slotId}`}><Link className="characterLink" href={`/characters/${encodeURIComponent(slot.characterId??slot.character)}#equipment`}><CharacterName name={slot.character} id={slot.characterId}/></Link><EquipmentSlot slotId={slot.slotId}/><strong>Refine one copy to level {slot.minimumLevel??1}</strong><small>Replace {slot.currentItem}, level {slot.currentLevel}</small></li>)}</ul></details>
   </td></tr>;
  })}</tbody></table></div>
 </section>;
}
