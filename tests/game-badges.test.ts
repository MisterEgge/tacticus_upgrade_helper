import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import RankBadge from "../app/components/RankBadge";
import RarityBadge from "../app/components/RarityBadge";
import {RANK_NAMES} from "../src/domain/ranks";
import RankSelect from "../app/components/RankSelect";
import MaterialTable from "../app/material-completion/MaterialTable";
import type {MaterialCompletionRow} from "../src/domain/materialCompletion";

test("every supported rank uses its exact pinned artwork and retains its accessible name",()=>{
 for(const [index,name] of RANK_NAMES.entries()){
  for(const rank of [index,name]){
   const dom=new JSDOM(renderToStaticMarkup(createElement(RankBadge,{rank})));
   const badge=dom.window.document.querySelector('[role="img"]')!;
   assert.equal(badge.getAttribute("aria-label"),name);
   assert.equal(badge.getAttribute("title"),name);
   assert.equal(badge.textContent,"");
   assert.equal(badge.querySelector("img")!.getAttribute("src"),`/ranks/${name.split(" ")[0]!.toLowerCase()}${index%3+1}.png`);
   dom.window.close();
  }
 }
 for(const rank of [-1,20,NaN,1.5,"RESEARCHING","Legendary II",undefined]){
  const html=renderToStaticMarkup(createElement(RankBadge,{rank}));
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/<span>.+<\/span>/);
 }
});

test("all rank and rarity assets match the pinned source manifests",()=>{
 for(const folder of ["ranks","rarity"]){
  const manifest=JSON.parse(readFileSync(`public/${folder}/SOURCES.json`,"utf8")) as {commit:string;assets:Record<string,{sha256:string;blob:string}>};
  assert.match(manifest.commit,/^[a-f0-9]{40}$/);
  assert.equal(Object.keys(manifest.assets).length,folder==="ranks"?20:6);
  for(const [file,source] of Object.entries(manifest.assets)){
   const bytes=readFileSync(`public/${folder}/${file}`);
   assert.equal(bytes.subarray(1,4).toString(),"PNG");
   assert.equal(createHash("sha256").update(bytes).digest("hex"),source.sha256);
   assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"),source.blob);
  }
 }
 for(const rarity of ["Common","Uncommon","Rare","Epic","Legendary","Mythic"]){
  const html=renderToStaticMarkup(createElement(RarityBadge,{rarity}));
  assert.ok(html.includes(`aria-label="${rarity}"`));
  assert.ok(html.includes(`/rarity/${rarity.toLowerCase()}.png`));
 }
 assert.doesNotMatch(renderToStaticMarkup(createElement(RarityBadge,{rarity:"Unknown"})),/<img/);
});

test("failed artwork falls back to readable text and a changed source can load again",async()=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost"});
 const previous={window:globalThis.window,document:globalThis.document,self:globalThis.self};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,self:dom.window});
 const {render,fireEvent,cleanup,act}=await import("@testing-library/react");
 try{
  const view=render(createElement(RankBadge,{rank:13}));
  fireEvent.error(view.container.querySelector("img")!);
  assert.equal(view.container.textContent,"Gold II");
  view.rerender(createElement(RankBadge,{rank:14}));
  assert.ok(view.getByRole("img",{name:"Gold III"}));
  view.unmount();
  const selector=render(createElement("label",null,"Target rank",createElement(RankSelect,{name:"target",defaultValue:"13"})));
  fireEvent.change(selector.getByRole("combobox",{name:"Target rank"}),{target:{value:"16"}});
  assert.equal(selector.container.querySelector(".rankBadge")!.getAttribute("aria-label"),"Diamond II");
  selector.unmount();
  const base:MaterialCompletionRow={id:"fixture-rare",name:"First material",rarity:"Rare",craftable:false,inventory:0,remaining:1,required:1,allocated:0,shortage:1,surplus:0,unowned:0,status:"farming",recipients:[]};
  const materials=render(createElement(MaterialTable,{rows:[base,{...base,id:"fixture-epic",name:"Second material",rarity:"Epic"}]}));
  fireEvent.change(materials.getByRole("textbox"),{target:{value:"rare"}});
  assert.ok(materials.getByText("First material"));
  assert.equal(materials.queryByText("Second material"),null);
  assert.ok(materials.getByRole("img",{name:"Rare"}));
  await act(async()=>cleanup());
 }finally{Object.assign(globalThis,previous);dom.window.close();}
});
