import Link from "next/link";
import {getShopCatalog}from "../lib/shops";
import {sourcesForItem}from "../../src/domain/shops";
import Nav from "../components/Nav";
import {getReport,targetName}from "../lib/report";
import EquipmentTable from "./EquipmentTable";

export default async function Equipment()
{
 const[report,shops]=await Promise.all([getReport(),getShopCatalog()]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const inventory=new Map<string,number>();for(const item of report.unequippedInventory)inventory.set(item.id,(inventory.get(item.id)??0)+item.amount);
 const all=[...report.equipmentAllocation.equipNow.map(row=>({...row,state:"EQUIP NOW",target:targetName(row)})),...report.equipmentAllocation.buyWatch.map(row=>({...row,state:"NEED",target:targetName(row)})),...report.equipmentAllocation.compatibilityUnknown.map(row=>({...row,state:"UNKNOWN",target:targetName(row)}))];
 const slots=all.map(row=>
 {
   const ids=[...new Set(row.recommendedItemId?[row.recommendedItemId]:row.preferredLegendaryItemIds??[])];
   return {...row,acquisition:ids.map(id=>({id,name:shops?.equipment[id]?.name??id,shops:shops?sourcesForItem(id,shops):[]})),available:ids.reduce((total,id)=>total+(inventory.get(id)??0),0),holders:report.roster.flatMap(unit=>unit.items.filter(item=>ids.includes(item.id)&&unit.name!==row.character).map(item=>({character:unit.name,characterId:unit.id,slotId:item.slotId,level:item.level})))};
 });
 const rows=[...slots.reduce<Map<string,{character:string;characterId?:string;slots:typeof slots}>>((groups,slot)=>{let row=groups.get(slot.character);if(!row){row={character:slot.character,slots:[]};if(slot.characterId)row.characterId=slot.characterId;groups.set(slot.character,row);}row.slots.push(slot);return groups;},new Map()).values()].sort((a,b)=>a.character.localeCompare(b.character));
 return <main><Nav/><header><div><p className="eyebrow">EQUIPMENT</p><h1>Character Upgrade Queue</h1><p className="sub">Open a character to see each Legendary upgrade slot, exact inventory copies, other holders for context, and the known acquisition routes. Holder names are never a recommendation to take their gear.</p><p><Link className="sourceLink" href="/sources?item=">Shop catalogs, rotations and refresh tracking</Link></p></div><div className="power">{slots.length}<strong> upgrade slots</strong></div></header><section className="cards compact"><div className="card"><strong>{report.equipmentAllocation.equipNow.length}</strong><span>Equip now</span></div><div className="card"><strong>{report.equipmentAllocation.buyWatch.length}</strong><span>Need to acquire</span></div><div className="card"><strong>{report.equipmentAllocation.compatibilityUnknown.length}</strong><span>Needs compatibility review</span></div></section><section className="panel detailPanel"><EquipmentTable rows={rows}/></section></main>;
}
