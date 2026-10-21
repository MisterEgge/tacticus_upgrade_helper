import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,rename,rm,utimes} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileCache} from "../app/lib/fileCache";

test("configuration cache reuses unchanged parses and reloads every input, including replacements",async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),"tacticus-cache-"));
 try{
  const first=path.join(folder,"first.json"),second=path.join(folder,"second.json");
  await writeFile(first,'{"value":1}');await writeFile(second,'{"value":2}');
  let parses=0;
  const load=fileCache([first,second],texts=>{parses++;return texts.map(text=>JSON.parse(text).value);});
  const initial=await load();assert.deepEqual(initial,[1,2]);
  assert.equal(await load(),initial);assert.equal(parses,1);
  await writeFile(second,'{"value":3}');
  await utimes(second,new Date(),new Date(Date.now()+2000));
  assert.deepEqual(await load(),[1,3]);
  const replacement=path.join(folder,"replacement.json");
  await writeFile(replacement,'{"value":4}');await rename(replacement,first);
  assert.deepEqual(await load(),[4,3]);assert.equal(parses,3);
  await writeFile(first,'invalid');
  await assert.rejects(load(),SyntaxError);
  await writeFile(first,'{"value":5}');
  assert.deepEqual(await load(),[5,3]);
  await rm(second);await assert.rejects(load(),{code:"ENOENT"});
 }finally{await rm(folder,{recursive:true,force:true});}
});
