"use client"; import DataTable,{Column} from "../components/DataTable";import CharacterName from "../components/CharacterName";import type{RosterUnit}from "../lib/report";
export default function CharacterTable({rows}:{rows:RosterUnit[]}){const c:Column<RosterUnit>[]=[
{key:"name",label:"Character",sort:r=>r.name,search:r=>r.name,render:r=><CharacterName name={r.name} id={r.id}/>},
{key:"faction",label:"Faction",sort:r=>r.faction,search:r=>r.faction+" "+r.grandAlliance,render:r=><>{r.faction}<small>{r.grandAlliance}</small></>},
{key:"rarity",label:"Rarity",sort:r=>r.progressionIndex,search:r=>r.rarity,render:r=><span className={"rarity "+r.rarity.toLowerCase()}>{r.rarity}</span>},
{key:"rank",label:"Rank",sort:r=>r.rank,render:r=>r.rank},{key:"xp",label:"XP",sort:r=>r.xpLevel,render:r=>r.xpLevel},
{key:"active",label:"Active",sort:r=>r.abilities[0]?.level??0,render:r=>r.abilities[0]?.level??"—"},{key:"passive",label:"Passive",sort:r=>r.abilities[1]?.level??0,render:r=>r.abilities[1]?.level??"—"},
{key:"shards",label:"Shards",sort:r=>r.shards,render:r=>r.shards}];return <DataTable rows={rows} columns={c} placeholder="Search character or faction…"/>;}