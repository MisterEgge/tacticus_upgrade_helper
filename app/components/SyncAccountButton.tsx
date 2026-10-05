"use client";

import {useRouter} from "next/navigation";
import {useEffect,useRef,useState} from "react";

type SyncStatus={automatic:boolean;configured:boolean;running:boolean;lastSynced:string|null;error:string|null};
export default function SyncAccountButton({lastSynced}:{lastSynced?:string}){
 const router=useRouter();
 const [syncing,setSyncing]=useState(false);
 const [error,setError]=useState<string>();
 const [status,setStatus]=useState<SyncStatus|null>(null);
 const observed=useRef(lastSynced??null);
 useEffect(()=>{observed.current=lastSynced??null;},[lastSynced]);
 useEffect(()=>{
  let active=true,pending=false;
  const check=async()=>{
   if(pending)return;pending=true;
   try{
    const response=await fetch("/api/sync",{cache:"no-store"});
    if(!response.ok)return;
    const result=await response.json() as SyncStatus;
    if(!active)return;
    setStatus(result);
    if(result.lastSynced&&result.lastSynced!==observed.current){observed.current=result.lastSynced;router.refresh();}
   }catch{/* Keep the last report usable during a temporary connection failure. */}
   finally{pending=false;}
  };
  void check();const timer=window.setInterval(()=>{void check();},60_000);
  const focus=()=>{void check();};window.addEventListener("focus",focus);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",focus);};
 },[router]);
 async function sync(){
  setSyncing(true);setError(undefined);
  try{
   const response=await fetch("/api/sync",{method:"POST"});
   const result=await response.json() as {ok:boolean;error?:string;syncedAt?:string};
   if(!response.ok||!result.ok)throw new Error(result.error??"Account sync failed.");
   setStatus(previous=>previous?{...previous,running:false,error:null}:previous);
   router.refresh();
  }catch(value){setError(value instanceof Error?value.message:"Account sync failed.");}
  finally{setSyncing(false);}
 }
 const running=syncing||status?.running;
 return <div className="syncAccount">
  <button type="button" onClick={sync} disabled={!!running}>{running?"Syncing…":"Sync Account"}</button>
  <small>{lastSynced?`Last synced: ${new Date(lastSynced).toLocaleString()}`:"Account has not been synced yet."}</small>
  {status?<small>{status.automatic?"Auto-sync: daily at 4 a.m. Central":status.configured?"Auto-sync off":"Auto-sync needs an API key"}</small>:null}
  {error||status?.error?<small className="syncError" role="status">{error??status?.error}</small>:null}
 </div>;
}
