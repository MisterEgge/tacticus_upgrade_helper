"use client";
import CharacterName from "../components/CharacterName";import DataTable,{Column} from "../components/DataTable";import type {EquipmentRow} from "../lib/report";
type Row=EquipmentRow&{id?:string;icon?:string;target:string};
export default function FarmingTable({rows}:{rows:Row[]}){const cols:Column<Row>[]=[
{key:"character",label:"Character",render:x=><CharacterName name={x.character} id={x.id} icon={x.icon}/>,sort:x=>x.character,search:x=>x.character},
{key:"priority",label:"Priority",render:x=>x.accountPriority,sort:x=>x.accountPriority},
{key:"need",label:"Need",render:x=><strong>{x.target}</strong>,sort:x=>x.target,search:x=>x.target},
{key:"current",label:"Current",render:x=>x.currentItem,sort:x=>x.currentItem,search:x=>x.currentItem},
{key:"source",label:"Source",render:()=> <span className="status unknown">NODE DATA NEXT</span>,search:()=>"node data next"}];
return <DataTable rows={rows} columns={cols} placeholder="Search character or item…"/>}