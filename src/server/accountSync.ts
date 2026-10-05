import {execFile} from "node:child_process";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {promisify} from "node:util";
import {dailySyncDue,nextDailySyncAt,DAILY_SYNC_TIMEZONE} from "../domain/dailySync";

const execFileAsync=promisify(execFile);
const scripts=["fetchPlayer.ts","fetchGuildData.ts","snapshotCampaignProgress.ts","analyzePlayer.ts"] as const;
export type SyncRunner=(script:string)=>Promise<void>;
export class SyncAlreadyRunningError extends Error{constructor(){super("Account sync is already running.");}}
// Both instrumentation and route bundles share this state, including after dev reloads.
const globalSync=globalThis as typeof globalThis & {tacticusAccountSync?:{running:boolean;started:boolean;timer?:ReturnType<typeof setTimeout>;lastError:string|null}};
const state=globalSync.tacticusAccountSync??={running:false,started:false,lastError:null};
async function runScript(script:string){
 const loader=pathToFileURL(path.join(process.cwd(),"node_modules/tsx/dist/loader.mjs")).href;
 try{await execFileAsync(process.execPath,["--import",loader,path.join(process.cwd(),"src",script)],{cwd:process.cwd(),env:process.env,timeout:120_000,maxBuffer:10*1024*1024});}
 catch(error){
  const failure=error as {code?:string|number;stdout?:string};
  console.error("Account sync script failed",{script,exitCode:failure.code??"unknown",apiStatuses:failure.stdout?.match(/GET \/api\/v1\/[a-zA-Z]+ -> \d+/g)??[]});
  throw error;
 }
}
export async function refreshAccount(runner:SyncRunner=runScript):Promise<string>{
 if(state.running)throw new SyncAlreadyRunningError();
 state.running=true;
 try{
  for(const script of scripts)await runner(script);
  state.lastError=null;
  return new Date().toISOString();
 }catch(error){state.lastError=automaticSyncEnabled()?"Account sync failed. It will retry automatically; manual Sync Account is also available.":"Account sync failed. Manual Sync Account is available.";throw error;}
 finally{state.running=false;}
}
async function lastReportSync():Promise<string|null>{
 try{const report=JSON.parse(await readFile(path.join(process.cwd(),"output/upgrade-report.json"),"utf8"));return typeof report.generatedAt==="string"?report.generatedAt:null;}catch{return null;}
}
export function automaticSyncEnabled(){return !!process.env.TACTICUS_API_KEY&&process.env.TACTICUS_AUTO_SYNC!=="false";}
export async function syncStatus(){
 const enabled=automaticSyncEnabled();
 return {automatic:enabled,configured:!!process.env.TACTICUS_API_KEY,running:state.running,timezone:DAILY_SYNC_TIMEZONE,hour:4,nextScheduledAt:enabled?nextDailySyncAt(new Date()).toISOString():null,lastSynced:await lastReportSync(),error:state.lastError};
}
export function stopDailyAccountSync(){
 if(state.timer)clearTimeout(state.timer);
 delete state.timer;state.started=false;
}
export function startDailyAccountSync(runner:SyncRunner=runScript){
 if(state.started||!automaticSyncEnabled())return;
 state.started=true;
 const check=async()=>{
  let retry=false;
  try{
   if(automaticSyncEnabled()&&dailySyncDue(new Date(),await lastReportSync())){
    await refreshAccount(runner);
    console.info("Daily account sync completed.");
   }
  }catch(error){retry=true;if(!(error instanceof SyncAlreadyRunningError))console.error("Daily account sync failed; retrying in 15 minutes.");}
  finally{
   // Short wake-ups also handle PC sleep, clock adjustments, and manual refreshes.
   const delay=retry?15*60_000:Math.min(30*60_000,Math.max(1000,nextDailySyncAt(new Date()).getTime()-Date.now()));
   state.timer=setTimeout(()=>{void check();},delay);
   state.timer.unref();
  }
 };
 return check();
}
