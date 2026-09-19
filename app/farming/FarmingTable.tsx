"use client";import DataTable,{Column,Filter}from"../components/DataTable";
type Row={id:string;name:string;rarity:string;stat:string;node:string;campaign:string;campaignType:string;nodeNumber:number;energy:number;rate:number};
export default function FarmingTable({rows}:{rows:Row[]}){const c:Column<Row>[]=[
{key:"material",label:"Material",sort:r=>r.name,search:r=>r.name+" "+r.id,render:r=><><strong>{r.name}</strong><small>{r.rarity} · {r.stat}</small></>},
{key:"campaign",label:"Best campaign",sort:r=>r.campaign,search:r=>r.campaign+" "+r.campaignType,render:r=><><strong>{r.campaign}</strong><small>{r.campaignType}</small></>},
{key:"node",label:"Node",sort:r=>r.nodeNumber,search:r=>r.node,render:r=><strong>{r.node}</strong>},{key:"energy",label:"Energy",sort:r=>r.energy,render:r=>r.energy},
{key:"rate",label:"Expected drop",sort:r=>r.rate,render:r=>r.rate?((r.rate*100).toFixed(1)+"%"):"—"}];
const f:Filter<Row>[]=[{key:"elite",label:"Elite",matches:r=>r.campaignType==="Elite"},{key:"legendary",label:"Legendary",matches:r=>r.rarity==="Legendary"},{key:"epic",label:"Epic",matches:r=>r.rarity==="Epic"},{key:"rare",label:"Rare",matches:r=>r.rarity==="Rare"}];return <DataTable rows={rows} columns={c} filters={f} placeholder="Search material, campaign, node, rarity…"/>}