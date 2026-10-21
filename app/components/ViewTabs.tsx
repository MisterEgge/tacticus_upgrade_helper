"use client";
import {useId,useRef,useState,type ReactNode} from "react";

/** Keep each view mounted so navigating between tasks preserves local controls. */
export default function ViewTabs({label,tabs,defaultTab}:{label:string;tabs:Array<{label:string;content:ReactNode}>;defaultTab:string}){
 const [active,setActive]=useState(defaultTab);
 const id=useId(),buttons=useRef<Array<HTMLButtonElement|null>>([]);
 return <div className="viewTabs"><div role="tablist" aria-label={label} className="viewTabList">{tabs.map((tab,index)=><button key={tab.label} ref={button=>{buttons.current[index]=button;}} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active===tab.label} tabIndex={active===tab.label?0:-1} onClick={()=>setActive(tab.label)} onKeyDown={event=>{
  const next=event.key==="ArrowRight"?(index+1)%tabs.length:event.key==="ArrowLeft"?(index+tabs.length-1)%tabs.length:event.key==="Home"?0:event.key==="End"?tabs.length-1:null;
  if(next!==null){event.preventDefault();setActive(tabs[next]!.label);buttons.current[next]?.focus();}
 }}>{tab.label}</button>)}</div>{tabs.map((tab,index)=><div key={tab.label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active!==tab.label} tabIndex={0}>{tab.content}</div>)}</div>;
}
