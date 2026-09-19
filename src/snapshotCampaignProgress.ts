import fs from "node:fs/promises";
import path from "node:path";

type Battle={battleIndex:number};
type Campaign={id:string;name:string;type:string;battles:Battle[]};
type Unit={id:string;name?:string;rank:number;progressionIndex:number;abilities:Array<{id:string;level:number}>};
type PlayerFile={metaData:{lastUpdatedOn:number};player:{units:Unit[];progress?:{campaigns?:Campaign[]}}};
type Catalog={characters:Array<{name:string;id:string;campaignsRequiredIn:string[]}>};
type Snapshot={capturedAt:string;apiLastUpdatedOn:number;campaigns:Record<string,{id:string;type:string;highestUnlockedBattle:number;highestCompletedBattle:number;requiredCharacters:Array<{name:string;id:string;rank:number|null;progressionIndex:number|null;activeLevel:number|null;passiveLevel:number|null}>}>};

async function read<T>(p:string){return JSON.parse(await fs.readFile(p,"utf8")) as T;}
async function main(){
 const player=await read<PlayerFile>("data/player.json"),catalog=await read<Catalog>("data/character_catalog.json");
 const units=new Map(player.player.units.map(u=>[u.name??u.id,u]));
 const campaigns:Snapshot["campaigns"]={};
 for(const c of player.player.progress?.campaigns??[]){
  if(c.type!=="Elite"&&c.type!=="EliteMirror")continue;
  const unlocked=c.battles.reduce((m,b)=>Math.max(m,b.battleIndex+1),0);
  const baseName=c.name.replace(/\s+Elite(?:\s+Mirror)?$/i,"").replace(/\s+Mirror$/i,"").trim();
  const required=catalog.characters.filter(x=>x.campaignsRequiredIn.includes(baseName)||x.campaignsRequiredIn.includes(c.name));
  campaigns[c.id]={id:c.id,type:c.type,highestUnlockedBattle:unlocked,highestCompletedBattle:Math.max(0,unlocked-1),requiredCharacters:required.map(ch=>{const u=units.get(ch.name);return{name:ch.name,id:ch.id,rank:u?.rank??null,progressionIndex:u?.progressionIndex??null,activeLevel:u?.abilities[0]?.level??null,passiveLevel:u?.abilities[1]?.level??null};})};
 }
 const snap:Snapshot={capturedAt:new Date().toISOString(),apiLastUpdatedOn:player.metaData.lastUpdatedOn,campaigns};
 const dir=path.join("data","history","campaigns");await fs.mkdir(dir,{recursive:true});
 const latest=path.join(dir,"latest.json");let previous:Snapshot|null=null;try{previous=await read<Snapshot>(latest)}catch{}
 const advanced=Object.entries(campaigns).some(([id,c])=>c.highestCompletedBattle>(previous?.campaigns[id]?.highestCompletedBattle??-1));
 if(advanced||!previous){const stamp=snap.capturedAt.replace(/[:.]/g,"-");await fs.writeFile(path.join(dir,stamp+".json"),JSON.stringify(snap,null,2));console.log("Saved campaign milestone snapshot.");}
 else console.log("No new Elite completion milestone; history unchanged.");
 await fs.writeFile(latest,JSON.stringify(snap,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
