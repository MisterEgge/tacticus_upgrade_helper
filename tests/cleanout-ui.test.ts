import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import CleanoutTable from "../app/inventory-cleanout/CleanoutTable";
import {inventoryCleanout} from "../src/domain/inventoryCleanout";
import shops from "../data/game/shops.json";

test("cleanout search, decisions, per-level copy details and independent collapsible groups remain usable",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,within}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>{cleanup();});dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const character={id:"a",name:"Recipient A",faction:"ThousandSons",traits:[],equipment:["I_Block"]};
 const rows=inventoryCleanout([{id:"I_Block_R003",amount:5,level:1},{id:"I_Block_R003",amount:1,level:7},{id:"I_Block_E006",amount:2,level:1}],[{id:"a",name:"Recipient A",progressionIndex:15,items:[{slotId:"Slot2",id:"I_Block_L003",level:1}]}],[],[character],shops.equipment);
 const view=render(createElement(CleanoutTable,{rows,reserveLocked:true}));
 const surplus=within(view.getByRole("region",{name:"Surplus level-1 copies"}));
 const details=surplus.getByText(/Copy and recipient details/).closest("details")!;
 fireEvent.click(within(details).getByText(/Copy and recipient details/));
 const stacks=within(details).getByRole("table");
 const copyRows=within(stacks).getAllByRole("row").slice(1);
 assert.deepEqual(within(copyRows[0]!).getAllByRole("cell").map(cell=>cell.textContent),["7","1","1","0","0"]);
 assert.deepEqual(within(copyRows[1]!).getAllByRole("cell").map(cell=>cell.textContent),["1","5","0","5","0"]);
 assert.ok(within(details).getByRole("link",{name:"Recipient A"}));
 const review=within(view.getByRole("region",{name:"Manual review"}));
 fireEvent.click(review.getByRole("button",{name:/Manual review/}));
 assert.match(review.getAllByRole("table")[0]!.textContent!,/SITUATIONAL — REVIEW/);
 fireEvent.click(surplus.getByRole("button",{name:/Surplus level-1 copies/}));
 assert.equal(surplus.queryByRole("table"),null);
 assert.ok(review.getAllByRole("table").length);
 fireEvent.change(view.getByLabelText("Search cleanout"),{target:{value:"Recipient A"}});
 assert.ok(view.getByRole("region",{name:"Manual review"}));
 fireEvent.change(view.getByLabelText("Cleanout decisions"),{target:{value:"review"}});
 assert.equal(view.queryByRole("region",{name:"Surplus level-1 copies"}),null);
 fireEvent.change(view.getByLabelText("Search cleanout"),{target:{value:"no such item"}});
 assert.match(view.container.textContent!,/No inventory items match this view/);
});
