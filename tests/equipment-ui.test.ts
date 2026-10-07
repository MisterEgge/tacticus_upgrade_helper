import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import EquipmentTable from "../app/equipment/EquipmentTable";
import {buildEquipmentPlan} from "../app/lib/equipmentPlan";
import type {Report} from "../app/lib/report";
import type {ShopCatalog} from "../src/domain/shops";
import type {CatalogCharacter} from "../app/lib/catalog";
import catalogData from "../data/character_catalog.json";
import shopsData from "../data/game/shops.json";

const catalog=catalogData as {characters:CatalogCharacter[]};
const shops=shopsData as ShopCatalog;
function unit(name:string,id:string,itemName:string,faction?:string):Report["roster"][number]{
 const meta=catalog.characters.find(row=>row.name===name)!;
 return {id:meta.id,name,faction:faction??meta.faction,grandAlliance:"Imperial",rarity:"Legendary",rank:12,xpLevel:36,progressionIndex:12,shards:0,mythicShards:0,abilities:[],items:id?[{id,name:itemName,rarity:id.includes("_L")?"Legendary":"Epic",slotId:id.includes("Defensive")?"Slot2":"Slot1",level:1}]:[]};
}

test("equipment sections collapse independently, retain character expansion and expose shared readiness and purchase routes",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,within}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>{cleanup();});dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const report:Report={generatedAt:"2026-10-06T00:00:00Z",source:{player:"TEST",powerLevel:52},summary:{units:5,charactersWithAbilitiesBelow17:0,individualAbilityUpgradesTo17:0,legendaryUnderTierSlots:2},abilityQueue:[],roster:[unit("Trajann","I_Crit_E001","Old Knife"),unit("Kariyan","I_Crit_E001","Other Knife"),unit("Exitor-Rho","I_Defensive_L003","Grand Plated Greaves","AdeptusMechanicus"),unit("Tyrith","I_Crit_E010","Adorned Ceremonial Knife"),unit("Aleph-Null","","")],unequippedInventory:[{id:"I_Crit_L001",amount:1,level:1},{id:"I_Defensive_L004",amount:1,level:1}],equipmentAllocation:{equipNow:[{character:"Trajann",characterId:catalog.characters.find(row=>row.name==="Trajann")!.id,slotId:"Slot1",currentItem:"Old Knife",currentRarity:"Epic",currentLevel:1,accountPriority:100,recommendedItemId:"I_Crit_L001",recommendedItem:"Grand Combat Knife"}],buyWatch:[],compatibilityUnknown:[]}};
 const {rows}=buildEquipmentPlan(report,catalog,shops);
 assert.equal(rows.length,5);
 assert.equal(rows.find(row=>row.character==="Exitor-Rho")!.slots.find(slot=>slot.state==="EQUIP NOW")!.allocatedItemId,"I_Defensive_L004");
 const view=render(createElement(EquipmentTable,{rows,needs:[],raidNames:["Trajann","Kariyan","Exitor-Rho","Tyrith","Aleph-Null"],campaignNames:[],defenseTeams:[],offenseTeams:[]}));
 const ready=within(view.getByRole("region",{name:"Equip now"}));
 assert.match(ready.getByRole("table").textContent!,/Trajann.*Grand Combat Knife/s);
 assert.match(ready.getByRole("table").textContent!,/Exitor-Rho.*Grand Mantle/s);
 assert.doesNotMatch(ready.getByRole("table").textContent!,/Kariyan/);
 fireEvent.click(ready.getByRole("button",{name:/Equip now/}));
 assert.equal(ready.queryByRole("table"),null);
 assert.ok(within(view.getByRole("region",{name:"Shop upgrade opportunities"})).getByRole("table"));
 fireEvent.click(view.getByRole("button",{name:"Characters"}));
 const characters=within(view.getByRole("region",{name:"Character equipment"}));
 const rho=characters.getByRole("button",{name:/^Exitor-Rho/});
 const tyrith=characters.getByRole("button",{name:/^Tyrith/});
 const empty=characters.getByRole("button",{name:/^Aleph-Null/});
 assert.match(rho.textContent!,/Upgrade now/);
 assert.match(tyrith.textContent!,/Buy an upgrade.*Crusade Shop/);
 assert.match(empty.textContent!,/No verified replacement/);
 fireEvent.click(rho);fireEvent.click(tyrith);
 assert.equal(rho.getAttribute("aria-expanded"),"true");
 assert.equal(tyrith.getAttribute("aria-expanded"),"true");
 const tyrithBody=document.getElementById(tyrith.getAttribute("aria-controls")!)!;
 assert.match(tyrithBody.textContent!,/715 Crusade Credits/);
 assert.match(tyrithBody.textContent!,/Random item pool · check stock/);
 assert.ok(within(tyrithBody).getByRole("link",{name:"Where to get Grand Ceremonial Knife"}).getAttribute("href")?.includes("I_Crit_L010"));
 const parent=characters.getByRole("button",{name:/^Character equipment/});
 fireEvent.click(parent);assert.equal(characters.queryByRole("button",{name:/^Tyrith/}),null);
 fireEvent.click(parent);assert.equal(tyrith.getAttribute("aria-expanded"),"true");
 fireEvent.click(view.getByRole("button",{name:"Shop upgrades"}));
 fireEvent.click(view.getByRole("button",{name:"Characters"}));
 assert.equal(rho.getAttribute("aria-expanded"),"true");
 fireEvent.change(view.getByLabelText("Search equipment upgrades"),{target:{value:"Grand Plated Greaves"}});
 assert.ok(characters.getByRole("button",{name:/^Exitor-Rho/}));
 assert.equal(characters.queryByRole("button",{name:/^Tyrith/}),null);
 fireEvent.change(view.getByLabelText("Search equipment upgrades"),{target:{value:"Aleph-Null"}});
 assert.equal(characters.queryByRole("button",{name:/^Tyrith/}),null);
 assert.ok(characters.getByRole("button",{name:/^Aleph-Null/}));
});
