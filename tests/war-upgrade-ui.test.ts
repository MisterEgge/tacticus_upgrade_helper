import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import WarUpgradePlanner from "../app/upgrades/WarUpgradePlanner";
import type {WarUpgradeSource} from "../src/domain/warUpgrades";

test("War upgrades show one character row, rank icons, complete prerequisites and working side/target controls",async suite=>{
    const dom=new JSDOM("<html><body></body></html>",{url:"http://localhost/"});
    const descriptors=new Map<string,PropertyDescriptor|undefined>();
    for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
    const {render,fireEvent,within,cleanup}=await import("@testing-library/react");
    suite.after(()=>{cleanup();dom.window.close();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
    const source:WarUpgradeSource={key:"test",side:"defense",kind:"core",core:["A","B","C"],used:1000,rate:90,flex:[{id:"D",used:500,rate:92},{id:"E",used:500,rate:94}]};
    const roster=["A","B","C","D","E"].map(id=>({id,name:id,rank:id==="A"?7:9,rarity:id==="A"?"Uncommon":"Rare"}));
    const props={roster,sources:[source,{...source,key:"offense",side:"offense" as const}],defaults:{defense:[],offense:[]},reviewed:{defense:"2026-10-22",offense:"2026-11-03"}};
    const view=render(createElement(WarUpgradePlanner,props));
    let region=within(view.getByRole("region",{name:"Defense upgrade opportunities"}));
    assert.equal(region.getAllByRole("row").length,2);
    assert.ok(region.getAllByRole("img",{name:"Bronze II"}).length>0);assert.ok(region.getAllByRole("img",{name:"Silver I"}).length>0);
    assert.ok(region.getAllByRole("img",{name:"Rare"}).length>0);
    assert.ok(region.getByText("Completes this lineup's rank requirements"));
    assert.equal(region.getByRole("link",{name:"Plan materials"}).getAttribute("href"),"/farming?character=A&target=9");
    assert.equal(view.container.querySelector<HTMLDetailsElement>("details")!.open,false);
    fireEvent.click(region.getByText("Team for A"));
    assert.equal(view.container.querySelector<HTMLDetailsElement>("details")!.open,true);
    assert.equal(view.container.querySelectorAll(".warUpgradeLineup>div").length,2*5);
    fireEvent.change(view.getByRole("combobox",{name:"War upgrade target"}),{target:{value:"gold"}});
    region=within(view.getByRole("region",{name:"Defense upgrade opportunities"}));
    assert.equal(region.getAllByRole("row").length,6);
    assert.ok(region.getAllByText("4 teammates also need upgrades").length>0);
    fireEvent.click(view.getByRole("tab",{name:"Offense"}));
    assert.ok(view.getByRole("region",{name:"Offense upgrade opportunities"}));
    fireEvent.change(view.getByRole("searchbox",{name:"Find upgrade character"}),{target:{value:"missing"}});
    assert.match(view.getByRole("region",{name:"Offense upgrade opportunities"}).textContent!,/No matching characters/);
});
