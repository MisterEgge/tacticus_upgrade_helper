import {NextResponse} from "next/server";
import {refreshAccount,syncStatus,SyncAlreadyRunningError} from "../../../src/server/accountSync";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json(await syncStatus(),{headers:{"Cache-Control":"no-store"}});}
export async function POST(){
 try{return NextResponse.json({ok:true,syncedAt:await refreshAccount()});}
 catch(error){
  if(error instanceof SyncAlreadyRunningError)return NextResponse.json({ok:false,error:error.message},{status:409});
  console.error("Account sync failed");
  return NextResponse.json({ok:false,error:"Account sync failed. Check the API key and server logs."},{status:500});
 }
}
