import ResourceName,{ResourceText} from "./ResourceName";
import Link from "next/link";
import {equipmentOffersForItem,type ShopCatalog} from "../../src/domain/shops";

type Target={recommendedItemId?:string;preferredLegendaryItemIds?:string[]};
export default function EquipmentSources({target,catalog,powerLevel}:{target:Target;catalog:ShopCatalog|null;powerLevel:number|null})
{
 const ids=[...new Set(target.recommendedItemId?[target.recommendedItemId]:target.preferredLegendaryItemIds??[])];
 return <div className="equipmentSources">{ids.length?ids.map(id=>{
  const offers=catalog?equipmentOffersForItem(id,catalog,powerLevel):[];
  const unique=offers.filter((offer,index)=>offers.findIndex(other=>other.shop===offer.shop&&other.rotation===offer.rotation&&other.price===offer.price&&other.match===offer.match&&other.access===offer.access)===index);
  return <div key={id}><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(id)}`}><ResourceName id={id} name={`Where to get ${catalog?.equipment[id]?.name??id}`}/></Link>{unique.length?unique.map(offer=><small key={offer.id}>{offer.shop} · {offer.rotation} · <ResourceText text={offer.price}/>{offer.match==="pool"?" · Random item pool":" · Exact catalog item"}{offer.adRefresh?" · Ad refresh":""}{offer.access==="unknown"?" · Check access":""}</small>):<small>No verified shop route{catalog?" for your account level":" — catalog unavailable"}. Open sources for other routes.</small>}</div>;
 }):<small>Item target unresolved · <Link className="sourceLink" href="/sources">Browse shops</Link></small>}<small>Check current stock in-game.</small></div>;
}
