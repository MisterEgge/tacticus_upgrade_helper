"use client";
import {useId,useState,type ReactNode} from "react";

export default function CollapsibleSection({title,summary,children,defaultOpen=true,className="",label}:{title:string;summary?:ReactNode;children:ReactNode;defaultOpen?:boolean;className?:string;label?:string})
{
 const [open,setOpen]=useState(defaultOpen);
 const id=useId();
 return <section className={`campaignInvestmentGroup collapsibleSection ${className}`} aria-label={label??title}>
  <button type="button" className="campaignSectionToggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
   <div><h2>{title}</h2>{summary?<p className="warSource">{summary}</p>:null}</div>
   <span className="campaignChevron" aria-hidden="true">{open?"▴":"▾"}</span>
  </button>
  <div id={id} className="campaignSectionBody" hidden={!open}>{children}</div>
 </section>;
}
