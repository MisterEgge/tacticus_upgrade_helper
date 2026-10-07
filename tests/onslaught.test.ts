import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {JSDOM} from "jsdom";
import {honorReward,onslaughtPriorities,readSectorChoices,type OnslaughtCandidate} from "../src/domain/onslaught";
import {rateCharacter} from "../src/domain/characterUtility";
import HonorPriorities from "../app/onslaught/HonorPriorities";
import {WAR_PLAN_STORAGE_KEY} from "../src/domain/warBadgeTargets";

function unit(id:string,alliance="Imperial",index=9,shards:number|null=0):OnslaughtCandidate {
 return {id,name:id,alliance,progressionIndex:index,rank:9,shards,mythicShards:0,campaignGoals:[],xpLevel:35,
  activeLevel:35,passiveLevel:35,activeTarget:35,passiveTarget:35,targetsReviewed:true,campaignShardSource:false,
  utility:rateCharacter({name:id,communityScore:3,accountPriority:0,mainRaidCore:false,mainRaidFlex:false,raidCore:false,raidFlex:false,warOption:false,incompleteCampaign:false})};
}

test("current honor rules separate stages, shard types and sector rewards",()=>{
 for(const [index,orb] of [[2,"Uncommon"],[5,"Rare"],[8,"Epic"],[11,"Legendary"],[12,"Legendary"],[14,"Legendary"],[15,"Mythic"],[18,"Mythic"]] as const)assert.equal(honorReward(index,null)?.orb,orb);
 assert.deepEqual(honorReward(9,null)?.badges,["Epic"]);
 assert.deepEqual(honorReward(11,null)?.badges,[]);
 assert.deepEqual(honorReward(12,null)?.badges,["Legendary"]);
 assert.deepEqual(honorReward(15,null)?.badges,["Legendary","Mythic"]);
 assert.equal(honorReward(19,null)?.orb,null);
 assert.equal(honorReward(15,null)?.shardType,"Mythic");
 assert.equal(honorReward(11,null)?.shards,null);
 assert.deepEqual(honorReward(11,{sector:"gold",tier:1})?.shards,{min:10,max:11});
 assert.deepEqual(honorReward(14,{sector:"gold",tier:3})?.shards,{min:16,max:18});
 assert.deepEqual(honorReward(15,{sector:"stone",tier:1})?.shards,{min:1,max:1});
 assert.deepEqual(honorReward(15,{sector:"diamond",tier:1})?.shards,{min:1,max:2});
 assert.deepEqual(honorReward(17,{sector:"adamantine",tier:4})?.shards,{min:2,max:3});
 assert.equal(honorReward(-1,null),null);assert.equal(honorReward(20,null),null);
 assert.deepEqual(readSectorChoices({Imperial:{sector:"gold",tier:4},Chaos:{sector:"fake",tier:2},Xenos:{sector:"silver",tier:0}}),{Imperial:{sector:"gold",tier:4}});
});

test("honor top threes prioritize actual shared shortages and rarity needs without extra-star spending",()=>{
 const epic=unit("Ready Epic","Imperium",11,100);
 const farmer=unit("Legendary farmer","Imperial",13,0);
 const blue=unit("Blue star","Imperial",15,0);
 const core=unit("Raid core");core.utility={...core.utility,mainRaidCore:true};
 const rows=[epic,farmer,blue,core,unit("Bench"),unit("Other"),unit("Xenos choice","Xenos"),unit("Chaos choice","Chaos"),unit("Invalid","Chaos",20)];
 const groups=onslaughtPriorities(rows,{Imperial:[{rarity:"Legendary",amount:4}]},{},new Map(),{Imperial:{sector:"gold",tier:1}});
 assert.deepEqual(groups.map(group=>group.waveBadges),["Chaos","Imperial","Xenos"]);
 const imperial=groups[0]!;
 assert.equal(imperial.rows.length,3);assert.equal(imperial.deployable,true);
 assert.equal(imperial.rows.some(row=>row.id===blue.id||row.id==="Covered"),false);
 assert.equal(imperial.rows.filter(row=>row.orbPool?.shortfall===6).length,2);
 assert.ok(imperial.rows.find(row=>row.id===farmer.id));
 assert.ok(imperial.rows.find(row=>row.id===core.id));
 assert.equal(groups[1]!.rows[0]!.alliance,"Xenos");assert.equal(groups[1]!.deployable,false);
 assert.deepEqual(imperial.rows.find(row=>row.id===core.id)?.battles,{min:23,max:25});
 const covered=onslaughtPriorities(rows,{Imperial:[{rarity:"Legendary",amount:10}]},{},new Map(),{});
 assert.equal(covered[0]!.rows.some(row=>row.id===epic.id||row.id===farmer.id),false);
 assert.equal(onslaughtPriorities([farmer],null,{},new Map(),{})[0]!.rows.length,0);
 assert.equal(onslaughtPriorities([blue],{},null,new Map(),{},true)[0]!.rows[0]?.reward.shardType,"Mythic");
 const unknown=onslaughtPriorities([unit("Unknown shards","Chaos",11,null)],null,null,new Map(),{});
 assert.match(unknown[2]!.rows[0]!.reasons[0]!,/unknown/);assert.equal(unknown[2]!.rows[0]!.battles,null);
});

test("badge farmers require eligible documented goals or active War slots",()=>{
 const member={...unit("Ability farmer","Imperial",12,1000),activeLevel:34,activeTarget:35};
 assert.equal(onslaughtPriorities([member],{}, {},new Map(),{})[0]!.rows.length,0); // Current honor yields Legendary, not needed Epic badges.
 const legend={...member,activeLevel:41,activeTarget:44,xpLevel:44};
 assert.equal(onslaughtPriorities([legend],{}, {},new Map(),{})[0]!.rows.length,1);
 assert.equal(onslaughtPriorities([{...legend,xpLevel:41}],{}, {},new Map(),{})[0]!.rows.length,0);
 assert.equal(onslaughtPriorities([{...legend,targetsReviewed:false}],{}, {},new Map(),{})[0]!.rows.length,0);
 const epic={...unit("War badge farmer"),activeLevel:26,passiveLevel:26,targetsReviewed:false,shards:1000};
 assert.equal(onslaughtPriorities([epic],{}, {},new Map(),{})[0]!.rows.length,0);
 assert.equal(onslaughtPriorities([epic],{}, {},new Map([[epic.name,35]]),{})[0]!.rows.length,1);
});

test("honor UI separates faction lists, persists manual sectors per account and reveals optional Mythic",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,within}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>cleanup());dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const candidates=[unit("Imperial A"),unit("Imperial B"),unit("Imperial C"),unit("Imperial D"),unit("Chaos A","Chaos"),unit("Xenos A","Xenos"),unit("Blue star","Xenos",15)];
 const props={candidates,orbs:{},badges:{},defenseTeams:[],offenseTeams:[],accountKey:"TEST ACCOUNT"};
 const view=render(createElement(HonorPriorities,props));
 assert.equal(within(view.getByRole("table",{name:"Imperial honor priorities"})).getAllByRole("row").length,4);
 assert.equal(view.queryByText("Blue star"),null);
 assert.ok(view.getByText(/one regenerates every 16 hours/));
 assert.ok(view.container.querySelector('[data-resource-id="onslaughtToken"] img'));
 fireEvent.change(view.getByRole("combobox",{name:"Imperial sector"}),{target:{value:"gold"}});
 fireEvent.change(view.getByRole("combobox",{name:"Imperial sector stage"}),{target:{value:"4"}});
 assert.deepEqual(JSON.parse(localStorage.getItem("tacticus-onslaught-sectors-v1:TEST ACCOUNT")!),{Imperial:{sector:"gold",tier:4}});
 assert.equal(view.getByRole("combobox",{name:"Chaos sector"}).getAttribute("value"),null);
 assert.match(view.getByRole("table",{name:"Imperial honor priorities"}).textContent!,/10–11 regular shards/);
 fireEvent.click(view.getByRole("checkbox",{name:"Include optional Mythic honor goals"}));
 assert.ok(view.getByRole("link",{name:/Blue star/}));
 fireEvent.click(view.getByRole("button",{name:/Imperial · top 3/}));assert.equal(view.queryByRole("table",{name:"Imperial honor priorities"}),null);
 // An account change remounts the component on the page; settings stay scoped.
 view.unmount();
 const other=render(createElement(HonorPriorities,{...props,accountKey:"OTHER ACCOUNT"}));
 assert.equal((other.getByRole("combobox",{name:"Imperial sector"}) as HTMLSelectElement).value,"");
 localStorage.setItem(WAR_PLAN_STORAGE_KEY,"not json");fireEvent.focus(window);
 assert.ok(other.getByRole("table",{name:"Imperial honor priorities"}));
});
