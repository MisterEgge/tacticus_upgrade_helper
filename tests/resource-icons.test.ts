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
