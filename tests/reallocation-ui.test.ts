import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import ReallocationPlanner,{type ReallocationProps} from "../app/reallocation/ReallocationPlanner";
import {WAR_PLAN_STORAGE_KEY} from "../src/domain/warBadgeTargets";

test("gear transfers protect Aesoth and follow saved War selections when focus changes",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,within}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>cleanup());dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const props:ReallocationProps={
  units:[{id:"aesoth",name:"Aesoth",rarity:"Legendary",items:[{slotId:"Slot1",id:"legendary",rarity:"Legendary",level:1}]},{id:"maladus",name:"Maladus",rarity:"Legendary",items:[{slotId:"Slot1",id:"legendary",rarity:"Legendary",level:3}]},{id:"raid",name:"Raid",rarity:"Legendary",items:[{slotId:"Slot1",id:"epic",rarity:"Epic",level:9}]}],
  targets:[{character:"Raid",characterId:"raid",slotId:"Slot1",itemId:"legendary",minimumLevel:1,inventoryReady:false}],
  characters:[{id:"aesoth",name:"Aesoth",faction:"Allowed",equipment:["I_Crit"]},{id:"maladus",name:"Maladus",faction:"Allowed",equipment:["I_Crit"]},{id:"raid",name:"Raid",faction:"Allowed",equipment:["I_Crit"]}],
  equipment:{legendary:{name:"Legendary pistol",type:"I_Crit",rarity:"Legendary",allowedFactions:["Allowed"]},epic:{name:"Epic pistol",type:"I_Crit",rarity:"Epic",allowedFactions:["Allowed"]}},
  raidNames:["Raid"],raidOptions:["Aesoth"],campaignNames:[],campaignUnknown:[],focus:{},offenseTeams:[],
  defenseTeams:Array.from({length:6},(_,index)=>({name:`Team ${index}`,used:1,members:[{name:index===0?"Maladus":`Other ${index}`}]}))
 };
 const view=render(createElement(ReallocationPlanner,props));
 const transfers=()=>within(view.getByRole("region",{name:"Suggested gear transfers"}));
 assert.ok(transfers().getByText("No gear transfers recommended."));
 assert.equal(view.queryByText("Aesoth"),null);
 assert.equal(view.queryByText(/Keep equipped|Protected gear|Why it stays/),null);
 dom.window.localStorage.setItem(WAR_PLAN_STORAGE_KEY,JSON.stringify({defense:["Team 1","Team 2","Team 3","Team 4","Team 5","Team 0"]}));
 await act(async()=>{dom.window.dispatchEvent(new dom.window.Event("focus"));});
 assert.ok(transfers().getByText("Maladus"));
 assert.ok(transfers().getByText("Raid"));
 assert.ok(transfers().getByText("Epic pistol"));
 assert.equal(transfers().queryByText("Aesoth"),null);
 assert.equal(transfers().getAllByRole("row").length,2);
 assert.equal(view.queryByText(/Keep equipped|Protected gear|Why it stays/),null);
});
