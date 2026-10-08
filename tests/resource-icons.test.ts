import {readFileSync} from "node:fs";
import ProgressionBadge from "../app/components/ProgressionBadge";
import {JSDOM} from "jsdom";
import assert from "node:assert/strict";
import test from "node:test";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {buildResourceIcons,resourceTextId,type ResourceIconCatalog} from "../src/domain/resourceIcons";
import ResourceName,{ResourceText} from "../app/components/ResourceName";
import data from "../data/game/resource-icons.json";
import recipes from "../data/game/upgrade-recipes.json";
import shops from "../data/game/shops.json";

test("resource artwork covers materials, equipment and every supported alliance/rarity without inventing paths",()=>{
 const catalog=data as ResourceIconCatalog;
 assert.match(catalog.commit,/^[a-f0-9]{40}$/);
 assert.equal(Object.keys(recipes).every(id=>!!catalog.icons[id]),true);
 assert.equal(Object.keys(shops.equipment).every(id=>!!catalog.icons[id]),true);
 for(const alliance of ["Imperial","Xenos","Chaos"])for(const rarity of ["Uncommon","Rare","Epic","Legendary","Mythic"]){assert.ok(catalog.icons[`orb:${alliance}:${rarity}`]?.background);assert.ok(catalog.icons[`badge:${alliance}:${rarity}`]);}
 assert.ok(catalog.icons.gold);assert.ok(catalog.icons.xpLegendary);
 const fixture=buildResourceIcons("a".repeat(40),new Set(["equipment/Crit_Item_Icon.webp","snowprint_assets/equipment/ui_icon_item_R_Crit_DW02AdvancedBurstCannon.png"]),{missing:{material:"Unknown"}},{R_Crit_Dw02AdvancedBurstCannon:{name:"DW-02",type:"I_Crit"},other:{name:"No artwork",type:"I_Crit"}});
 assert.match(fixture.icons.R_Crit_Dw02AdvancedBurstCannon!.image,/DW02/);
 assert.equal(fixture.icons.other?.fallback,true);assert.ok(fixture.missing.includes("other"));assert.equal(fixture.icons.missing,undefined);
});
test("resource labels retain names and text, use pinned game art, and combine orb layers",()=>{
 assert.equal(resourceTextId("10 Imperium Epic orbs"),"orb:Imperial:Epic");
 assert.equal(resourceTextId("1,485 Guild Credits"),"guildCredits");
 const orb=renderToStaticMarkup(createElement(ResourceName,{id:"orb:Chaos:Legendary"}));
 assert.equal((orb.match(/<img /g)??[]).length,2);assert.match(orb,/Chaos Legendary orbs/);assert.doesNotMatch(orb,/\/develop\//);
 const text=renderToStaticMarkup(createElement(ResourceText,{text:"Get 10 Imperial Epic orbs for 1,485 Guild Credits; check coins."}));
 assert.match(text,/data-resource-id="orb:Imperial:Epic"/);assert.match(text,/data-resource-id="guildCredits"/);assert.match(text,/data-resource-id="gold"/);
 const unknown=renderToStaticMarkup(createElement(ResourceName,{id:"missing-fixture",name:"Unknown material"}));
 assert.match(unknown,/Unknown material/);assert.doesNotMatch(unknown,/<img /);
});

test("progression badges show visible game stars, rarity color and accessible labels at every color boundary",()=>{
 for(const [index,label,color,count] of [[0,"Common · no stars","yellow",0],[8,"Rare · 1 red star","red",1],[11,"Epic · 3 red stars","red",3],[14,"Legendary · 5 red stars","red",5],[15,"Legendary · 1 blue star","blue",1],[18,"Mythic · 3 blue stars","blue",3],[19,"Mythic · wings","wings",1]] as const){
  const dom=new JSDOM(renderToStaticMarkup(createElement(ProgressionBadge,{index})));
  const badge=dom.window.document.querySelector('[role="img"]')!;
  assert.equal(badge.getAttribute("aria-label"),label);
  assert.ok(badge.querySelector(`.rarity.${label.split(" · ")[0]!.toLowerCase()}`));
  const images=badge.querySelectorAll("img");assert.equal(images.length,count);
  for(const image of images){
   assert.equal(image.getAttribute("alt"),"");
   assert.equal(image.getAttribute("src"),`/progression/${color==="wings"?"mythic-wings":`${color}-star`}.png`);
   const bytes=readFileSync(`public${image.getAttribute("src")}`);
   assert.equal(bytes.subarray(1,4).toString(),"PNG");
  }
  assert.doesNotMatch(badge.textContent!,/red stars|blue star|yellow star|wings/);
  dom.window.close();
 }
 for(const index of [-1,20,NaN])assert.equal(renderToStaticMarkup(createElement(ProgressionBadge,{index})),"<span>Unknown progression</span>");
});
