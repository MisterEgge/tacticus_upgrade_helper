import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,mkdir,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {latestDailySyncAt,nextDailySyncAt,dailySyncDue} from "../src/domain/dailySync";
import {refreshAccount,SyncAlreadyRunningError,startDailyAccountSync,stopDailyAccountSync,syncStatus} from "../src/server/accountSync";

test("daily schedule is 4 a.m. Central in summer and winter, using calendar days across DST",()=>{
 assert.equal(nextDailySyncAt(new Date("2026-10-05T17:19:05Z")).toISOString(),"2026-10-06T09:00:00.000Z");
 assert.equal(nextDailySyncAt(new Date("2026-12-05T17:19:05Z")).toISOString(),"2026-12-06T10:00:00.000Z");
 const spring=new Date("2026-03-07T10:00:00Z"),fall=new Date("2026-10-31T09:00:00Z");
 assert.equal(nextDailySyncAt(spring).getTime()-spring.getTime(),23*60*60_000);
 assert.equal(nextDailySyncAt(fall).getTime()-fall.getTime(),25*60*60_000);
 assert.equal(nextDailySyncAt(new Date("2026-12-31T11:00:00Z")).toISOString(),"2027-01-01T10:00:00.000Z");
});

test("startup catches up a missed daily cutoff and manual sync after it satisfies the day",()=>{
 const now=new Date("2026-10-05T09:00:00Z");
 assert.equal(latestDailySyncAt(new Date("2026-10-05T08:59:59Z")).toISOString(),"2026-10-04T09:00:00.000Z");
 assert.equal(dailySyncDue(now,"2026-10-05T08:59:59Z"),true);
 assert.equal(dailySyncDue(now,"2026-10-05T09:00:00Z"),false);
 assert.equal(dailySyncDue(new Date("2026-10-05T17:00:00Z"),"2026-10-05T10:00:00Z"),false);
 assert.equal(dailySyncDue(now,null),true);assert.equal(dailySyncDue(now,"invalid"),true);
});

test("manual and scheduled refresh share a lock, order the whole pipeline, and release on failure",async()=>{
 let unblock!:()=>void;
 const hold=new Promise<void>(resolve=>{unblock=resolve;});
 const calls:string[]=[];
 const first=refreshAccount(async script=>{calls.push(script);if(calls.length===1)await hold;});
 await assert.rejects(refreshAccount(async()=>assert.fail("Concurrent runner executed")),SyncAlreadyRunningError);
 unblock();await first;
 assert.deepEqual(calls,["fetchPlayer.ts","fetchGuildData.ts","snapshotCampaignProgress.ts","analyzePlayer.ts"]);
 const failed:string[]=[];
 await assert.rejects(refreshAccount(async script=>{failed.push(script);throw new Error("Synthetic fetch failure");}),/Synthetic fetch failure/);
 assert.deepEqual(failed,["fetchPlayer.ts"]);
 await refreshAccount(async()=>{});
});


test("running scheduler catches up missed syncs and retries failures after fifteen minutes without losing the report",async suite=>{
 const cwd=process.cwd(),oldKey=process.env.TACTICUS_API_KEY,oldFlag=process.env.TACTICUS_AUTO_SYNC;
 const fixture=await mkdtemp(path.join(tmpdir(),"tacticus-daily-sync-"));
 const reportPath=path.join(fixture,"output/upgrade-report.json");
 await mkdir(path.join(fixture,"output"));
 await writeFile(reportPath,JSON.stringify({generatedAt:"2026-10-04T09:00:00Z"}));
 process.chdir(fixture);process.env.TACTICUS_API_KEY="synthetic-not-a-real-key";delete process.env.TACTICUS_AUTO_SYNC;
 suite.mock.timers.enable({apis:["Date","setTimeout"],now:new Date("2026-10-05T09:00:00Z").getTime()});
 try{
  let calls=0,finish!:()=>void;
  const retried=new Promise<void>(resolve=>{finish=resolve;});
  const initial=startDailyAccountSync(async script=>{
   calls++;if(calls===1)throw new Error("Synthetic failure");
   if(script==="analyzePlayer.ts"){await writeFile(reportPath,JSON.stringify({generatedAt:new Date().toISOString()}));finish();}
  });
  await initial;
  assert.equal(calls,1);assert.match((await syncStatus()).error!,/retry automatically/);
  assert.equal(JSON.parse(await readFile(reportPath,"utf8")).generatedAt,"2026-10-04T09:00:00Z");
  suite.mock.timers.tick(14*60_000);assert.equal(calls,1);
  suite.mock.timers.tick(60_000);await retried;await new Promise<void>(resolve=>setImmediate(resolve));
  assert.equal(calls,5);assert.equal((await syncStatus()).error,null);
  assert.equal((await syncStatus()).lastSynced,"2026-10-05T09:15:00.000Z");
  // A restarted server sees the successful report and does not fetch again.
  stopDailyAccountSync();await startDailyAccountSync(async()=>assert.fail("Already synced today"));
 }finally{
  stopDailyAccountSync();suite.mock.timers.reset();process.chdir(cwd);
  if(oldKey===undefined)delete process.env.TACTICUS_API_KEY;else process.env.TACTICUS_API_KEY=oldKey;
  if(oldFlag===undefined)delete process.env.TACTICUS_AUTO_SYNC;else process.env.TACTICUS_AUTO_SYNC=oldFlag;
  await rm(fixture,{recursive:true,force:true});
 }
});
