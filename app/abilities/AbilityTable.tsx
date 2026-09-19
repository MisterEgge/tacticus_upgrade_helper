"use client";
import CharacterName from "../components/CharacterName";import DataTable,{Column,Filter} from "../components/DataTable";import type {AbilityRow} from "../lib/report";
type Row=AbilityRow&{id?:string;icon?:string};
export default function AbilityTable({rows}:{rows:Row[]}){
 const cols:Column<Row>[]=[
 {key:"character",label:"Character",render:x=><><CharacterName name={x.character} id={x.id} icon={x.icon}/><small>{x.faction}</small></>,sort:x=>x.character,search:x=>x.character+" "+x.faction},
 {key:"active",label:"Active",render:x=><><strong className={x.activeTo17?"below":""}>{x.activeLevel}</strong><small>{x.activeId}</small></>,sort:x=>x.activeLevel,search:x=>x.activeId},
 {key:"passive",label:"Passive",render:x=><><strong className={x.passiveTo17?"below":""}>{x.passiveLevel}</strong><small>{x.passiveId}</small></>,sort:x=>x.passiveLevel,search:x=>x.passiveId},
 {key:"priority",label:"Priority",render:x=>x.accountPriority,sort:x=>x.accountPriority},{key:"focus",label:"Focus",render:x=>x.focus,sort:x=>x.focus,search:x=>x.focus},{key:"basis",label:"Basis",render:x=><small>{x.basis}</small>,search:x=>x.basis}];
 const filters:Filter<Row>[]=[{key:"both",label:"Both below 17",matches:x=>x.activeTo17&&x.passiveTo17},{key:"active",label:"Active below 17",matches:x=>x.activeTo17},{key:"passive",label:"Passive below 17",matches:x=>x.passiveTo17},{key:"priority",label:"Priority 80+",matches:x=>x.accountPriority>=80}];
 return <DataTable rows={rows} columns={cols} filters={filters} placeholder="Search character, faction, ability or focus…"/>;}