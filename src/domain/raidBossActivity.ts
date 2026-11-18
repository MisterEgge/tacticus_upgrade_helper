export type RaidBossActivity={boss:string;battleAt:string};

const aliases:Record<string,readonly string[]>={
 "Avatar of Khaine":["avatarkhaine","avatarofkhaine","aeldaravatar"],
 "Belisarius Cawl":["belisariuscawl","cawl"],
 Ghazghkull:["ghazghkull"],
 "Hive Tyrant":["hivetyrant"],
 Magnus:["magnus"],
 Mortarion:["mortarion"],
 Riptide:["riptide"],
 "Rogal Dorn":["rogaldorn"],
 "Screamer-Killer":["screamerkiller"],
 Szarekh:["szarekh","silentking"],
 Tervigon:["tervigon"],
};
const maxAge=24*60*60*1000;
const normalize=(value:unknown)=>typeof value==="string"?value.toLowerCase().replace(/[^a-z0-9]/g,""):"";
const time=(value:unknown)=>{
 if(typeof value==="number"||typeof value==="string"&&/^\d+$/.test(value)){
  const number=Number(value);
  return number<1e12?number*1000:number;
 }
 return typeof value==="string"?Date.parse(value):NaN;
};

type Encounter={encounterType?:unknown;type?:unknown;unitId?:unknown;startedOn?:unknown;completedOn?:unknown;remainingHp?:unknown};

/** Only suggest the latest logged boss if it survived and the entry is recent. */
export function recentRaidBoss(entries:readonly Encounter[],now=Date.now()):RaidBossActivity|null{
 const latest=entries.flatMap(entry=>{
  if(!entry||typeof entry!=="object")return [];
  const at=time(entry.completedOn??entry.startedOn);
  return Number.isFinite(at)&&at<=now?[{entry,at}]:[];
 }).sort((a,b)=>b.at-a.at);
 const record=latest[0];
 if(!record||now-record.at>=maxAge)return null;
 const bossFor=({entry}:typeof record)=>{
  if(entry.encounterType!=="Boss"||typeof entry.remainingHp!=="number"||!Number.isFinite(entry.remainingHp)||entry.remainingHp<=0)return null;
  const identifiers=[normalize(entry.type),normalize(entry.unitId)];
  const matches=Object.entries(aliases).filter(([,names])=>names.some(name=>identifiers.some(id=>id.includes(name))));
  return matches.length===1?matches[0]![0]:null;
 };
 const boss=bossFor(record);
 if(!boss||latest.some(candidate=>candidate.at===record.at&&bossFor(candidate)!==boss))return null;
 return {boss,battleAt:new Date(record.at).toISOString()};
}

export function activeRaidBoss(activity:RaidBossActivity|null|undefined,now=Date.now()):string|null{
 const at=time(activity?.battleAt);
 return activity&&at<=now&&now-at<maxAge?activity.boss:null;
}
