"use client";
import EquipmentOpportunityGrid, { type EquipmentOpportunity } from "./EquipmentOpportunityGrid";
import { ResourceText } from "../components/ResourceName";
import type {EquipmentShopOffer} from "../../src/domain/shops";

type Recipient={character:string;characterId?:string;slotId:string;currentItem:string;currentItemId?:string|undefined;currentLevel:number;minimumLevel?:number};
export type ShoppingItem={id:string;name:string;members:Array<{slot:Recipient}>;offers:EquipmentShopOffer[]};
function Offer({offer}:{offer:EquipmentShopOffer}){
 return <div className="equipmentOpportunityOffer"><strong>{offer.shop}</strong><span><ResourceText text={offer.price}/> · {offer.rotation}</span>{offer.match==="pool"?<small>Random pool</small>:null}</div>;
}
export default function ShopShoppingList({items}:{items:ShoppingItem[]}){
 if(!items.length)return <p className="empty">No shop upgrades for this focus and search. Try Full roster to check other characters.</p>;
 const opportunities:EquipmentOpportunity[]=items.map(item=>{
   const offers=[...item.offers]
    .sort((a,b)=>Number(b.access==="eligible")-Number(a.access==="eligible")||Number(b.match==="exact")-Number(a.match==="exact"))
    .filter((offer,index,all)=>all.findIndex(candidate=>candidate.shop===offer.shop)===index);
   return {
    id:item.id,
    name:item.name,
    quantity:item.members.length,
    quantityLabel:"needed",
    slots:[...new Set(item.members.map(({slot})=>slot.slotId))],
    recipients:item.members.map(({slot})=>({
     character:slot.character,
     ...(slot.characterId ? {characterId:slot.characterId} : {})
    })),
    action:<>{offers[0]?<Offer offer={offers[0]}/>:null}{offers.length>1?<details className="equipmentOpportunityOtherOffers"><summary>{offers.length-1} other shop{offers.length===2?"":"s"}</summary>{offers.slice(1).map(offer=><Offer key={`${offer.shop}:${offer.id}`} offer={offer}/>)}</details>:null}</>
   };
 });
 return <><p className="sub equipmentShopNote">Each item is an alternative; compare its recipients instead of adding copy counts. Confirm stock in-game.</p>
  <EquipmentOpportunityGrid items={opportunities}/>
 </>;
}
