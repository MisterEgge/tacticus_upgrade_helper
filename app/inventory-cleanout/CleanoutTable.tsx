"use client";
import ResourceName from "../components/ResourceName";
import {useState} from "react";
import Link from "next/link";
import CollapsibleSection from "../components/CollapsibleSection";
import ReferenceDetails from "../components/ReferenceDetails";
import type {CleanoutRow} from "../../src/domain/inventoryCleanout";

export default function CleanoutTable({rows,reserveLocked}:{rows:CleanoutRow[];reserveLocked:boolean}) {
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("all");
 const group=(row:CleanoutRow)=>row.status==="UNKNOWN — DO NOT SCRAP"||row.status==="SITUATIONAL — REVIEW"?"review":row.scrap>0?"surplus":"keep";
 const matches=rows.filter(row=>(filter==="all"||filter===group(row))&&`${row.name} ${row.rarity} ${row.type} ${row.recipients.map(recipient=>recipient.name).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <>
  <section className="cards compact"><div className="card"><strong>{rows.reduce((sum,row)=>sum+row.scrap,0)}</strong><span>Level-1 surplus copies</span><small>{reserveLocked?"After owned + future reserves":"Owned-roster scope"}</small></div><div className="card"><strong>{rows.reduce((sum,row)=>sum+row.planned,0)}</strong><span>Planned replacements protected</span></div><div className="card"><strong>{rows.reduce((sum,row)=>sum+row.invested,0)}</strong><span>Leveled surplus protected</span><small>Manual decision</small></div><div className="card"><strong>{rows.filter(row=>group(row)==="review").length}</strong><span>Items needing review</span></div></section>
  <div className="abilityViews"><label>Show<select aria-label="Cleanout decisions" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All decisions</option><option value="surplus">Surplus</option><option value="keep">Keep / reserved</option><option value="review">Manual review</option></select></label></div>
  <input className="equipmentSearch" aria-label="Search cleanout" placeholder="Search equipment or recipient…" value={query} onChange={event=>setQuery(event.target.value)}/>
  {!matches.length?<p className="empty">No inventory items match this view.</p>:null}
  {[{id:"surplus",title:"Surplus level-1 copies",open:true},{id:"keep",title:"Keep and reserves",open:false},{id:"review",title:"Manual review",open:false}].map(section=>{
   const entries=matches.filter(row=>group(row)===section.id);
   return entries.length?<CollapsibleSection key={section.id} title={section.title} summary={`${entries.length} item types`} defaultOpen={section.open}>
    <div className="tableWrap"><table><thead><tr><th>Equipment</th><th>Inventory</th><th>Keep</th><th>Salvage candidates</th><th>Decision</th></tr></thead><tbody>{entries.map(row=><tr key={row.id}>
     <td><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(row.id)}`}><ResourceName id={row.id} name={row.name}/></Link><small>{row.rarity}</small></td>
     <td>{row.amount}<small>{row.stacks.map(stack=>`${stack.amount} × level ${stack.level}`).join(" · ")}</small></td><td>{row.keep}<small>{row.ownedReserve} owned · {row.futureReserve} future reserves</small></td><td><strong className={row.scrap?"ready":""}>{row.scrap||"—"}</strong></td><td><strong>{row.status}</strong><small>{row.reason}</small>
      <ReferenceDetails label={`Copy and recipient details · ${row.name}`}>
       <div className="tableWrap"><table><thead><tr><th>Level</th><th>Copies</th><th>Keep</th><th>Salvage candidates</th><th>Allocated</th></tr></thead><tbody>{row.stacks.map(stack=><tr key={stack.level}><td>{stack.level}</td><td>{stack.amount}</td><td>{stack.keep}</td><td>{stack.scrap}</td><td>{stack.allocated}</td></tr>)}</tbody></table></div>
       {row.futureRecipients&&!reserveLocked?<p>{row.futureRecipients} locked-character slot(s) would use future reserves. They are excluded from the selected owned-roster scope.</p>:null}
       <ul>{row.recipients.map(recipient=><li key={recipient.id}>{recipient.owned?<Link className="sourceLink" href={`/characters/${encodeURIComponent(recipient.id)}`}>{recipient.name}</Link>:<strong>{recipient.name} · locked</strong>}<small>{recipient.reason}</small></li>)}</ul>
      </ReferenceDetails>
     </td></tr>)}</tbody></table></div>
   </CollapsibleSection>:null;
  })}
 </>;
}
