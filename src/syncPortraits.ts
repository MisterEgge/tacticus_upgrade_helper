import fs from "node:fs/promises";import path from "node:path";
const dataUrl="https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/fsd/4-entities/character/data/new-character-data.json";
const assetBase="https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/assets/images/";
const response=await fetch(dataUrl);if(!response.ok)throw new Error(`Character data HTTP ${response.status}`);
const characters=await response.json() as Array<{id:string;Name:string;RoundIcon?:string;Icon?:string}>;
const dir=path.join(process.cwd(),"public","characters");await fs.mkdir(dir,{recursive:true});
let saved=0,missing=0;const manifest:Record<string,{name:string,file:string;source:string}>={};
for(const c of characters){const asset=c.RoundIcon??c.Icon;if(!asset){missing++;continue;}const url=assetBase+asset.split("/").map(encodeURIComponent).join("/");const r=await fetch(url);if(!r.ok){console.warn(`Missing portrait: ${c.Name} (${r.status})`);missing++;continue;}const ext=path.extname(asset)||".png";const file=`${c.id}${ext}`;await fs.writeFile(path.join(dir,file),Buffer.from(await r.arrayBuffer()));manifest[c.id]={name:c.Name,file:`/characters/${file}`,source:url};saved++;}
await fs.writeFile(path.join(dir,"manifest.json"),JSON.stringify({source:"svehera/tacticusplanner",saved,missing,characters:manifest},null,2));
console.log(`Saved ${saved} portraits to public/characters; ${missing} unavailable.`);
