"use client";
import {useId,useState,type ReactNode} from "react";
export default function CampaignRecommendationGroup({name,count,children}:{name:string;count:number;children:ReactNode})
{
 const [open,setOpen]=useState(true);
 const bodyId=useId();
 return <div className="campaignInvestmentGroup">
  <button type="button" className="campaignSectionToggle" aria-expanded={open} aria-controls={bodyId} onClick={()=>setOpen(value=>!value)}>
   <h3>{name} Elite</h3><div className="campaignSectionStatus"><small>{count} rank gaps</small><span className="campaignChevron" aria-hidden="true">{open?"▴":"▾"}</span></div>
  </button>
  <div id={bodyId} hidden={!open}>{children}</div>
 </div>;
}
