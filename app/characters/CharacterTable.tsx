"use client"; import Link from "next/link"; import DataTable,{Column} from "../components/DataTable";import CharacterName from "../components/CharacterName";import type{RosterUnit}from "../lib/report";
type Row=RosterUnit&{gearTargets:number;gearReview:boolean;abilityGaps:number};
export default function CharacterTable({rows}:{rows:Row[]}){const c:Column<Row>[]=[
{key:"name",label:"Character",sort:r=>r.name,search:r=>r.name,render:r=><Link className="characterLink" href={"/characters/"+encodeURIComponent(r.id)}><CharacterName name={r.name} id={r.id} icon={r.icon}/></Link>},
{key:"faction",label:"Faction",sort:r=>r.faction,search:r=>r.faction+" "+r.grandAlliance,render:r=><>{r.faction}<small>{r.grandAlliance}</small></>},
{key:"rarity",label:"Rarity",sort:r=>r.progressionIndex,search:r=>r.rarity,render:r=><span className={"rarity "+r.rarity.toLowerCase()}>{r.rarity}</span>},
{key:"rank",label:"Rank",sort:r=>r.rank,render:r=>r.rank},
{key:"status",label:"Upgrade status",sort:r=>r.gearTargets+r.abilityGaps,render:r=><>{r.gearTargets?<strong>{r.gearTargets} gear target{r.gearTargets===1?"":"s"}</strong>:null}{r.abilityGaps?<small>{r.abilityGaps} ability gap{r.abilityGaps===1?"":"s"}</small>:null}{r.gearReview?<small>Gear compatibility needs review</small>:null}{!r.gearTargets&&!r.abilityGaps&&!r.gearReview?"No current upgrade target":""}</>}];return <DataTable rows={rows} columns={c} placeholder="Search character, faction, or upgrade status…"/>;}
