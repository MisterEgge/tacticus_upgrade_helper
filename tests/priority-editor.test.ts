import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import {AppRouterContext, type AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import PriorityEditor from "../app/priorities/PriorityEditor";
import {DEFAULT_PRIORITIES} from "../src/domain/playerPriorities";

test("priorities can be reordered, disabled, pinned and saved; failures keep the editable draft",async suite=>{
    const dom=new JSDOM("<html><body></body></html>",{url:"http://localhost/"});
    const descriptors=new Map<string,PropertyDescriptor|undefined>();
    for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
    const {render,fireEvent,within,waitFor,cleanup}=await import("@testing-library/react");
    const oldFetch=globalThis.fetch;
    suite.after(()=>{cleanup();globalThis.fetch=oldFetch;dom.window.close();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
    let refreshed=0;let payload:unknown;let fail=true;
    globalThis.fetch=async (_url,init)=>{payload=JSON.parse(String(init?.body));return new Response(JSON.stringify(fail?{error:"Save failed"}:{ok:true}),{status:fail?503:200});};
    const router:AppRouterInstance={bfcacheId:"test",back(){},forward(){},push(){},replace(){},prefetch(){},refresh(){refreshed++;}};
    const view=render(createElement(AppRouterContext.Provider,{value:router},createElement(PriorityEditor,{initial:DEFAULT_PRIORITIES,configured:false,storage:"browser",characters:[{id:"unitA",name:"Aethana",rank:9}]})));
    fireEvent.click(view.getByRole("button",{name:"Move Guild Raid up"}));
    fireEvent.click(view.getByRole("button",{name:"Turn off Unfinished campaigns"}));
    fireEvent.change(view.getByRole("searchbox"),{target:{value:"aeth"}});
    fireEvent.click(view.getByRole("button",{name:"Prioritize Aethana"}));
    fireEvent.click(view.getByRole("button",{name:"Set priorities"}));
    await waitFor(()=>assert.match(view.getByRole("alert").textContent!,/Save failed/));
    assert.deepEqual(payload,{version:1,modes:["raid","war"],characters:["unitA"]});
    assert.ok(view.getByRole("button",{name:"Remove Aethana"}));
    assert.equal(refreshed,0);
    fail=false;fireEvent.click(view.getByRole("button",{name:"Set priorities"}));
    await waitFor(()=>assert.match(view.getByRole("status").textContent!,/Priorities saved/));
    assert.equal(refreshed,1);
    assert.equal(within(view.getAllByRole("list")[0]!).getAllByRole("listitem")[0]!.textContent?.startsWith("Guild Raid"),true);
});
