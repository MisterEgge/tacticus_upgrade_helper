"use client";
import {useId,useRef,useState,type ReactNode} from "react";

export const ALLIANCE_TABS=["Imperial","Xenos","Chaos"] as const;
export type AllianceTab=typeof ALLIANCE_TABS[number];

/** Keep panels mounted so sector controls and rarity disclosures retain state. */
export default function AllianceTabs({label,children}:{label:string;children:(alliance:AllianceTab)=>ReactNode}){
 const [active,setActive]=useState<AllianceTab>("Imperial");
 const id=useId(),buttons=useRef<Array<HTMLButtonElement|null>>([]);
 return <div className="allianceTabs">
  <div role="tablist" aria-label={label} className="allianceTabList">
   {ALLIANCE_TABS.map((alliance,index)=><button key={alliance} ref={button=>{buttons.current[index]=button;}} type="button" role="tab" id={`${id}-tab-${alliance}`} aria-controls={`${id}-panel-${alliance}`} aria-selected={active===alliance} tabIndex={active===alliance?0:-1} onClick={()=>setActive(alliance)} onKeyDown={event=>{
    const next=event.key==="ArrowRight"?(index+1)%3:event.key==="ArrowLeft"?(index+2)%3:event.key==="Home"?0:event.key==="End"?2:null;
    if(next!==null){event.preventDefault();setActive(ALLIANCE_TABS[next]!);buttons.current[next]?.focus();}
   }}>{alliance}</button>)}
  </div>
  {ALLIANCE_TABS.map(alliance=><div key={alliance} role="tabpanel" id={`${id}-panel-${alliance}`} aria-labelledby={`${id}-tab-${alliance}`} hidden={active!==alliance} tabIndex={0}>{children(alliance)}</div>)}
 </div>;
}
