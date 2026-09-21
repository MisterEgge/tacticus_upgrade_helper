import fs from "node:fs/promises";import path from "node:path";
const base="https://raw.githubusercontent.com/svehera/tacticusplanner/develop/";
const assetBase=base+"src/assets/images/";
type Portrait={id:string;name:string;asset?:string|undefined};
async function json<T>(url:string):Promise<T>{const r=await fetch(url);if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);return r.json() as Promise<T>;}
const characters=await json<Array<{id:string;Name:string;RoundIcon?:string;Icon?:string}>>(base+"src/fsd/4-entities/character/data/new-character-data.json");
const mowData=await json<{mows:Array<{snowprintId:string;name:string;roundIcon?:string;icon?:string}>}>(base+"src/fsd/4-entities/mow/data/new-mow-data.json");
const portraits:Portrait[]=[...characters.map(c=>({id:c.id,name:c.Name,asset:c.RoundIcon??c.Icon})),...mowData.mows.map(m=>({id:m.snowprintId,name:m.name,asset:m.roundIcon??m.icon}))];
const dir=path.join(process.cwd(),"public","characters");await fs.mkdir(dir,{recursive:true});
let saved=0,missing=0;const manifest:Record<string,{name:string;file:string;source:string}>={};
for(const p of portraits){if(!p.asset){console.warn(`No portrait metadata: ${p.name}`);missing++;continue;}const url=assetBase+p.asset.split("/").map(encodeURIComponent).join("/");const r=await fetch(url);if(!r.ok){console.warn(`Missing portrait: ${p.name} (${r.status})`);missing++;continue;}const ext=path.extname(p.asset)||".png";const file=`${p.id}${ext}`;await fs.writeFile(path.join(dir,file),Buffer.from(await r.arrayBuffer()));manifest[p.id]={name:p.name,file:`/characters/${file}`,source:url};saved++;}
await fs.writeFile(path.join(dir,"manifest.json"),JSON.stringify({source:"svehera/tacticusplanner",saved,missing,characters:manifest},null,2));
console.log(`Saved ${saved} character/MoW portraits to public/characters; ${missing} unavailable.`);
