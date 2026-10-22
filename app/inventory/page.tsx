import Nav from "../components/Nav";import{getReport}from"../lib/report";import InventoryTable from "./InventoryTable";import {getAccountInventory} from "../lib/accountInventory";
export default async function Inventory(){const r=await getReport();if(!r)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
const all=await getAccountInventory(r);
return <main><Nav/><header><div><p className="eyebrow">INVENTORY</p><h1>Inventory Demand</h1><p className="sub">Owned copies and next equipment targets. Refinement levels still determine whether a copy can be equipped.</p></div></header><section className="panel tablePanel"><InventoryTable rows={all}/></section></main>}
