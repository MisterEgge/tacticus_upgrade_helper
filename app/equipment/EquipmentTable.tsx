"use client"; import DataTable,{Column} from "../components/DataTable"; import CharacterName from "../components/CharacterName"; import type {EquipmentRow} from "../lib/report";
type Row=EquipmentRow&{state:string;target:string};
export default function EquipmentTable({rows}:{rows:Row[]}){const cols:Column<Row>[]=[
{key:"character",label:"Character",sort:r=>r.character,search:r=>r.character,render:r=><CharacterName name={r.character} id={r.characterId}/>},
{key:"priority",label:"Priority",sort:r=>r.accountPriority,render:r=>r.accountPriority},
{key:"slot",label:"Slot",sort:r=>r.slotId,render:r=>r.slotId},
{key:"current",label:"Current",sort:r=>r.currentItem,search:r=>r.currentItem,render:r=><>{r.currentItem}<small>{r.currentRarity} · Level {r.currentLevel}</small></>},
{key:"target",label:"Preferred target",sort:r=>r.target,search:r=>r.target,render:r=><strong>{r.target}</strong>},
{key:"status",label:"Status",sort:r=>r.state,search:r=>r.state,render:r=><span className={"status "+(r.state==="EQUIP NOW"?"ready":r.state==="NEED"?"need":"unknown")}>{r.state}</span>}
];return <DataTable rows={rows} columns={cols} placeholder="Search character, item, or status…"/>;}