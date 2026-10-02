import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import OrbPlanner from "../app/orbs/OrbPlanner";
import {rateCharacter} from "../src/domain/characterUtility";
import type {OrbCandidate} from "../src/domain/orbPlanner";
import type {ShopCatalog} from "../src/domain/shops";
import {WAR_PLAN_STORAGE_KEY} from "../src/domain/warBadgeTargets";
import shops from "../data/game/shops.json";

test("orb scopes restore War tiers, optional Mythic and full-goal budgets; source details show actionable shortages",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,within,waitFor}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>{cleanup();});dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const make=(name:string,index:number,core=false):OrbCandidate=>({id:name,name,alliance:"Xenos",progressionIndex:index,rank:0,shards:0,mythicShards:0,campaignGoals:[],utility:rateCharacter({name,communityScore:3,accountPriority:80,mainRaidCore:core,mainRaidFlex:false,raidCore:false,raidFlex:false,warOption:false,incompleteCampaign:false})});
 const candidates=[make("Core",0,true),make("War",8),make("Wing",15,true)];
 const offenseTeams=[{name:"Gold offense",used:1,members:[{name:"War"}]}];
 dom.window.localStorage.setItem(WAR_PLAN_STORAGE_KEY,JSON.stringify({offense:["Gold offense"],offenseTiers:Array.from({length:10},()=>"gold")}));
 const view=render(createElement(OrbPlanner,{candidates,inventory:{Xenos:[{rarity:"Uncommon",amount:12},{rarity:"Rare",amount:20},{rarity:"Epic",amount:4}]},defenseTeams:[],offenseTeams,shops:shops as ShopCatalog}));
 const rows=()=>within(view.getAllByRole("table")[1]!).getAllByRole("row");
 await waitFor(()=>assert.match(view.container.textContent!,/Active War Gold slot/));
 assert.equal(rows().length,3);assert.doesNotMatch(view.container.textContent!,/Mythic · 11 stars/);
 fireEvent.change(view.getByLabelText("Plan"),{target:{value:"goal"}});
 assert.match(rows()[1]!.textContent!,/460 regular shards total/);
 assert.match(rows()[1]!.textContent!,/10 Xenos Legendary/);
 fireEvent.change(view.getByLabelText("Include"),{target:{value:"war"}});
 assert.equal(rows().length,2);assert.match(rows()[1]!.textContent!,/War/);
 const sources=view.getByText("Get Xenos Epic orbs").closest("details")!;
 fireEvent.click(within(sources).getByText("Get Xenos Epic orbs"));
 assert.match(sources.textContent!,/3 draft orbs for 1,485 Guild Credits/);
 assert.match(sources.textContent!,/Cover 6 short with 2 pack\(s\): 2,970 Guild Credits/);
 assert.match(sources.textContent!,/spare lower orbs could make 4/);
 // Editing tiers changes the actual target; a Rare-capped offense does not need Epic.
 dom.window.localStorage.setItem(WAR_PLAN_STORAGE_KEY,JSON.stringify({offense:["Gold offense"],offenseTiers:Array.from({length:10},()=>"silver")}));
 fireEvent(window,new Event("storage"));
 await waitFor(()=>assert.match(view.container.textContent!,/No orb upgrades needed in this scope/));
 fireEvent.change(view.getByLabelText("Include"),{target:{value:"raid"}});
 fireEvent.click(view.getByLabelText("Include Mythic upgrades"));
 assert.match(view.container.textContent!,/20 Mythic shards/);
 assert.equal(rows().length,3);
});
