"use client";import DataTable,{Column,Filter}from"../components/DataTable";import type{InventoryItem}from"../lib/report";
type Recipient={character:string;priority:number};type Row=InventoryItem&{demandCount:number;net:number;recipients:Recipient[];topRecipient:string;topPriority:number};
export default function InventoryTable({rows}:{rows:Row[]}){const c:Column<Row>[]=[
{key:"item",label:"Item",sort:r=>r.name??r.id,search:r=>(r.name??"")+" "+r.id,render:r=><strong>{r.name??r.id}</strong>},
{key:"amount",label:"Owned",sort:r=>r.amount,render:r=>r.amount},{key:"demand",label:"Needed",sort:r=>r.demandCount,render:r=>r.demandCount||"—"},
{key:"balance",label:"Balance",sort:r=>r.net,render:r=><strong className={r.net<0?"below":""}>{r.net>0?"+":""}{r.net}</strong>},
{key:"recipients",label:"Recipients",sort:r=>r.topPriority,search:r=>r.recipients.map(x=>x.character).join(" "),render:r=>r.recipients.length?<>{r.recipients.slice(0,3).map((x,index)=><div key={`${x.character}-${x.priority}-${index}`}><strong>{x.character}</strong><small>Priority {x.priority}</small></div>)}{r.recipients.length>3?<small>+{r.recipients.length-3} more</small>:null}</>:"—"},
{key:"level",label:"Level",sort:r=>r.level,render:r=>r.level||"—"}];
const filters:Filter<Row>[]=[{key:"shortage",label:"Shortage",matches:r=>r.net<0},{key:"covered",label:"Demand covered",matches:r=>r.demandCount>0&&r.net>=0},{key:"surplus",label:"No current demand",matches:r=>r.demandCount===0}];return <DataTable rows={rows} columns={c} filters={filters} placeholder="Search inventory or recipient…"/>;}