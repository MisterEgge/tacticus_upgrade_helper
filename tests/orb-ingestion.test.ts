import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,mkdir,symlink,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

test("analysis exports official orb stacks and preserves Legendary star / Mythic rarity without mutating live files",async()=>{
 const root=process.cwd(),cwd=await mkdtemp(path.join(tmpdir(),"tacticus-orb-ingestion-"));
 try{
  await symlink(path.join(root,"config"),path.join(cwd,"config"));await mkdir(path.join(cwd,"data"));
  await symlink(path.join(root,"data/game"),path.join(cwd,"data/game"));
  const units=[15,16].map(index=>({id:`synthetic-${index}`,name:`Synthetic ${index}`,grandAlliance:"Xenos",progressionIndex:index,rank:0,xpLevel:1,shards:0,mythicShards:0,abilities:[],items:[]}));
  const player={metaData:{configHash:"synthetic",lastUpdatedOn:0,scopes:[]},player:{details:{name:"SYNTHETIC",powerLevel:1},units,inventory:{items:[],orbs:{Xenos:[{rarity:"Legendary",amount:7},{rarity:"Mythic",amount:2}]}}}};
  await writeFile(path.join(cwd,"data/player.json"),JSON.stringify(player));
  await promisify(execFile)(process.execPath,["--import",path.join(root,"node_modules/tsx/dist/loader.mjs"),path.join(root,"src/analyzePlayer.ts")],{cwd});
  const report=JSON.parse(await readFile(path.join(cwd,"output/upgrade-report.json"),"utf8"));
  assert.deepEqual(report.orbInventory,player.player.inventory.orbs);
  assert.deepEqual(report.roster.map((unit:{rarity:string})=>unit.rarity),["Legendary","Mythic"]);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
