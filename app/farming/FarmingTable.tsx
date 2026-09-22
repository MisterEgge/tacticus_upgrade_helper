"use client";import Link from "next/link";import DataTable,{Column,Filter}from"../components/DataTable";
type Row={id:string;shops:string[];name:string;rarity:string;owned:number;needed:number;shortage:number;topCharacter:string;topPriority:number;node:string;campaign:string;campaignType:string;nodeNumber:number;energy:number;rate:number};
export default function FarmingTable({rows}:{rows:Row[]}){const c:Column<Row>[]=[
{key:"material",label:"Material",sort:r=>r.name,search:r=>r.name+" "+r.id,render:r=><><strong>{r.name}</strong><small>{r.rarity}</small></>},
{key:"shortage",label:"Need",sort:r=>r.shortage,render:r=><><strong className="below">{r.shortage}</strong><small>{r.owned} allocated / {r.needed} required</small></>},
{key:"character",label:"Top recipient",sort:r=>r.topPriority,search:r=>r.topCharacter,render:r=><strong>{r.topCharacter||"—"}</strong>},
{key:"campaign",label:"Best unlocked source",sort:r=>r.campaign,search:r=>r.campaign+" "+r.campaignType+" "+r.node,render:r=>r.node?<><strong>{r.node}</strong><small>{r.campaign} · {r.campaignType}</small></>:<span className="status unknown">NO RECORDED UNLOCK</span>},
{key:"shops",label:"Shops / other sources",search:r=>r.shops.join(" "),render:r=><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(r.id)}`}>{r.shops.length?r.shops.join(", "):"Check sources / coverage"}<small>Catalog possibilities — verify stock</small></Link>},
{key:"energy",label:"Energy",sort:r=>r.energy,render:r=>r.energy||"—"},{key:"rate",label:"Expected / battle",sort:r=>r.rate,render:r=>r.rate?r.rate.toFixed(2):"—"}];
const f:Filter<Row>[]=[{key:"elite",label:"Elite source",matches:r=>r.campaignType.toLowerCase().includes("elite")},{key:"blocked",label:"No unlocked source",matches:r=>!r.node},{key:"legendary",label:"Legendary mats",matches:r=>r.rarity==="Legendary"}];return <DataTable rows={rows} columns={c} filters={f} placeholder="Search material, character, campaign or node…"/>}
