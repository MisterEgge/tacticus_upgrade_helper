export const DAILY_SYNC_TIMEZONE = "America/Chicago";
export const DAILY_SYNC_HOUR = 4;
const centralClock = new Intl.DateTimeFormat("en-US", {timeZone:DAILY_SYNC_TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});
function centralDate(now:Date){
 const parts=Object.fromEntries(centralClock.formatToParts(now).map(part=>[part.type,part.value]));
 return {year:Number(parts.year),month:Number(parts.month),day:Number(parts.day),hour:Number(parts.hour)};
}
function boundary(year:number,month:number,day:number):Date{
 const local=Date.UTC(year,month-1,day,DAILY_SYNC_HOUR);
 let utc=local;
 // Solve the wall-clock time using the zone's offset on this date, not today's offset.
 for(let pass=0;pass<3;pass++){
  const observed=centralDate(new Date(utc));
  utc+=local-Date.UTC(observed.year,observed.month-1,observed.day,observed.hour);
 }
 return new Date(utc);
}
export function latestDailySyncAt(now:Date):Date{
 const local=centralDate(now);
 return boundary(local.year,local.month,local.day-(local.hour<DAILY_SYNC_HOUR?1:0));
}
export function nextDailySyncAt(now:Date):Date{
 const local=centralDate(now);
 return boundary(local.year,local.month,local.day+(local.hour>=DAILY_SYNC_HOUR?1:0));
}
export function dailySyncDue(now:Date,lastSynced:string|null):boolean{
 const last=lastSynced?Date.parse(lastSynced):NaN;
 return !Number.isFinite(last)||last<latestDailySyncAt(now).getTime();
}
