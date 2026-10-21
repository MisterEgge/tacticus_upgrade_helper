import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import AllianceTabs from "../app/components/AllianceTabs";
import CollapsibleSection from "../app/components/CollapsibleSection";
import AbilityBadgeBudget from "../app/abilities/AbilityBadgeBudget";
import type {BudgetRow} from "../src/domain/abilityBudget";

test("alliance tabs support keyboard navigation, preserve rarity state and isolate badge budgets",async suite=>{
 const dom=new JSDOM("<html><body></body></html>",{url:"http://localhost"});
 const previous=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,within,cleanup,act}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>cleanup());dom.window.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const view=render(createElement(AllianceTabs,{label:"Test alliance",children:alliance=>createElement(CollapsibleSection,{title:`${alliance} Rare`,children:`${alliance} detail`})}));
 const imperial=view.getByRole("tab",{name:"Imperial"});
 assert.equal(imperial.getAttribute("aria-selected"),"true");assert.equal(view.getAllByRole("tabpanel").length,1);
 fireEvent.click(view.getByRole("button",{name:/Imperial Rare/}));
 fireEvent.keyDown(imperial,{key:"ArrowRight"});
 const xenos=view.getByRole("tab",{name:"Xenos"});
 assert.equal(document.activeElement,xenos);assert.equal(xenos.getAttribute("tabindex"),"0");
 assert.match(view.getByRole("tabpanel").textContent!,/Xenos Rare/);
 fireEvent.keyDown(xenos,{key:"End"});assert.equal(view.getByRole("tab",{name:"Chaos"}).getAttribute("aria-selected"),"true");
 fireEvent.keyDown(view.getByRole("tab",{name:"Chaos"}),{key:"ArrowRight"});
 assert.equal(view.getByRole("button",{name:/Imperial Rare/}).getAttribute("aria-expanded"),"false");
 fireEvent.keyDown(imperial,{key:"ArrowLeft"});assert.equal(view.getByRole("tab",{name:"Chaos"}).getAttribute("aria-selected"),"true");
 fireEvent.keyDown(view.getByRole("tab",{name:"Chaos"}),{key:"Home"});assert.equal(document.activeElement,imperial);
 view.unmount();
 const row:BudgetRow={id:"synthetic",name:"Synthetic Imperial",alliance:"Imperium",rank:9,rarity:"Rare",xpLevel:17,activeLevel:9,passiveLevel:17,activeTarget:17,passiveTarget:17,reviewed:true,recommended:true,communityScore:3,accountPriority:80,mainRaid:false,utilityTier:"Strong",utilitySignals:[]};
 const budget=render(createElement(AbilityBadgeBudget,{rows:[row,{...row,id:"xenos",name:"Synthetic Xenos",alliance:"Xenos"}],badgeInventory:{Imperial:[{rarity:"Uncommon",amount:2}],Xenos:[{rarity:"Uncommon",amount:30}]},defenseTeams:[],offenseTeams:[]}));
 assert.ok(budget.getByRole("table",{name:"Imperial badge totals"}));
 assert.equal(budget.queryByRole("table",{name:"Xenos badge totals"}),null);
 fireEvent.click(budget.getByRole("tab",{name:"Xenos"}));
 assert.ok(within(budget.getByRole("table",{name:"Xenos ability goals"})).getByText("Synthetic Xenos"));
 assert.equal(budget.queryByRole("table",{name:"Imperial ability goals"}),null);
});
