"use client";
import ResourceName,{ResourceText} from "../components/ResourceName";
import Link from "next/link";
import DataTable,{type Column,type Filter} from "../components/DataTable";
import CharacterName from "../components/CharacterName";
import {rankName} from "../../src/domain/ranks";
import type {CharacterRosterRow} from "../lib/characterUpgradeSummary";

export default function CharacterTable({rows}:{rows:CharacterRosterRow[]}) {
 const columns:Column<CharacterRosterRow>[]=[
  {key:"name",label:"Character",sort:row=>row.name,search:row=>`${row.name} ${row.faction} ${row.grandAlliance}`,render:row=><><Link className="characterLink" href={`/characters/${encodeURIComponent(row.id)}`}><CharacterName name={row.name} id={row.id} icon={row.icon}/></Link><small>{row.faction} · {row.grandAlliance}</small></>},
  {key:"progress",label:"Progress",sort:row=>row.rank,search:row=>`${row.rarity} ${rankName(row.rank)}`,render:row=><><strong>{rankName(row.rank)}</strong><small><span className={`rarity ${row.rarity.toLowerCase()}`}>{row.rarity}</span> · level {row.xpLevel}</small></>},
  {key:"actions",label:"Next upgrades",sort:row=>row.actions.filter(action=>action.ready).length,search:row=>row.actions.map(action=>`${action.label} ${action.detail}`).join(" "),render:row=>row.actions.length?row.actions.map(action=><div className="rosterAction" key={action.kind}><Link className={action.ready?"sourceLink":"characterLink"} href={action.href}>{action.resourceId?<ResourceName id={action.resourceId} name={action.label}/>:<ResourceText text={action.label}/>}</Link><small><ResourceText text={action.detail}/></small></div>):<Link className="sourceLink" href={`/characters/${encodeURIComponent(row.id)}#progression`}>Plan rank upgrades</Link>},
 ];
 const filters:Filter<CharacterRosterRow>[]=[
  {key:"ready",label:"Resources ready",matches:row=>row.actions.some(action=>action.ready)},
  {key:"gear",label:"Gear work",matches:row=>row.gearWork},
  {key:"badges",label:"Badges needed",matches:row=>row.badgesNeeded},
  {key:"orbs",label:"Orbs needed",matches:row=>row.orbsNeeded},
 ];
 return <DataTable rows={rows} columns={columns} filters={filters} placeholder="Search character, faction, rank, or next action…"/>;
}
