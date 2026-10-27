"use client";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import EquipmentSlot from "../components/EquipmentSlot";
import ResourceName,{ResourceText} from "../components/ResourceName";
import type {EquipmentShopOffer} from "../../src/domain/shops";

type Recipient={character:string;characterId?:string;slotId:string;currentItem:string;currentItemId?:string|undefined;currentLevel:number;minimumLevel?:number};
export type ShoppingItem={id:string;name:string;members:Array<{slot:Recipient}>;offers:EquipmentShopOffer[]};
function Offer({offer}:{offer:EquipmentShopOffer}){
 return <div><strong>{offer.shop}</strong><small><ResourceText text={offer.price}/> / {offer.rotation}</small>{offer.match==="pool"?<small>Random pool — item not guaranteed</small>:null}{offer.access==="unknown"?<small>Access unverified</small>:null}</div>;
}
export default function ShopShoppingList({items}:{items:ShoppingItem[]}){
 if(!items.length)return <p className="empty">No shop upgrades for this focus and search. Try Full roster to check other characters.</p>;
 return <><p className="sub equipmentShopNote">Alternative items can share slots; don’t add their quantities. Check stock in-game.</p>
  <div className="tableWrap equipmentShoppingList"><table><thead><tr><th>Item</th><th title="Copies needed">Qty</th><th>Shop / cost / rotation</th></tr></thead><tbody>{items.map(item=>{
   const offers=[...item.offers].sort((a,b)=>Number(b.access==="eligible")-Number(a.access==="eligible")||Number(b.match==="exact")-Number(a.match==="exact"));
   return <tr key={item.id}><td><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.id)}`}><ResourceName id={item.id} name={item.name}/></Link>
    <div className="equipmentShoppingSlots">{[...new Set(item.members.map(({slot})=>slot.slotId))].map(slotId=><EquipmentSlot key={slotId} slotId={slotId}/>)}</div>
    <details><summary>Who needs it</summary><ul className="equipmentShoppingRecipients">{item.members.map(({slot})=><li key={`${slot.characterId??slot.character}:${slot.slotId}`}><Link className="characterLink" href={`/characters/${encodeURIComponent(slot.characterId??slot.character)}#equipment`}><CharacterName name={slot.character} id={slot.characterId}/></Link><EquipmentSlot slotId={slot.slotId}/><small>Replace <ResourceName id={slot.currentItemId??""} name={slot.currentItem}/> / level {slot.currentLevel}{slot.minimumLevel&&slot.minimumLevel>1?` / replacement needs level ${slot.minimumLevel}`:""}</small></li>)}</ul></details>
   </td><td className="equipmentShoppingQuantity"><strong>{item.members.length}</strong></td><td>{offers[0]?<Offer offer={offers[0]}/>:null}{offers.length>1?<details><summary>{offers.length-1} other offers</summary>{offers.slice(1).map(offer=><Offer key={`${offer.shop}:${offer.id}`} offer={offer}/>)}</details>:null}</td></tr>;
  })}</tbody></table></div></>;
}
