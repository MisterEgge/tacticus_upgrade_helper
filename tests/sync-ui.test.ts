import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import {AppRouterContext,type AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import SyncAccountButton from "../app/components/SyncAccountButton";

test("sync header shows the daily schedule, refreshes background changes, and retains manual sync",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,waitFor}=await import("@testing-library/react");
 const oldFetch=globalThis.fetch;
 suite.after(async()=>{await act(async()=>{cleanup();});globalThis.fetch=oldFetch;dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 let syncedAt="2026-10-04T09:00:00Z",refreshes=0,manual=0;
 globalThis.fetch=async(_input,init)=>{
  if(init?.method==="POST"){manual++;return Response.json({ok:true,syncedAt});}
  return Response.json({automatic:true,configured:true,running:false,lastSynced:syncedAt,error:null});
 };
 const router:AppRouterInstance={bfcacheId:"synthetic",back(){},forward(){},push(){},replace(){},prefetch(){},refresh(){refreshes++;}};
 const view=render(createElement(AppRouterContext.Provider,{value:router},createElement(SyncAccountButton,{lastSynced:syncedAt})));
 await waitFor(()=>assert.ok(view.getByText("Auto-sync: daily at 4 a.m. Central")));
 assert.equal(refreshes,0);
 syncedAt="2026-10-05T09:00:00Z";fireEvent(window,new Event("focus"));
 await waitFor(()=>assert.equal(refreshes,1));
 fireEvent(window,new Event("focus"));
 await act(async()=>{});assert.equal(refreshes,1);
 fireEvent.click(view.getByRole("button",{name:"Sync Account"}));
 await waitFor(()=>assert.equal(manual,1));await waitFor(()=>assert.equal(refreshes,2));
});
