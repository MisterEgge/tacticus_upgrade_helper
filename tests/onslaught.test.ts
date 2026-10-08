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

test("honor top threes prioritize useful Legendary growth before established resource farmers",()=>{
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
 assert.equal(imperial.rows.filter(row=>row.orbPool?.shortfall===6).length,1);
 assert.deepEqual(imperial.rows.map(row=>row.id),["Raid core","Ready Epic","Bench"]);
 assert.equal(imperial.rows.some(row=>row.id===farmer.id),false);
 assert.ok(imperial.rows.find(row=>row.id===core.id));
 assert.equal(groups[1]!.rows[0]!.alliance,"Xenos");assert.equal(groups[1]!.deployable,false);
 assert.deepEqual(imperial.rows.find(row=>row.id===core.id)?.battles,{min:23,max:25});
 const covered=onslaughtPriorities(rows,{Imperial:[{rarity:"Legendary",amount:10}]},{},new Map(),{});
 assert.equal(covered[0]!.rows.some(row=>row.id===epic.id||row.id===farmer.id),false); // Other immediate growth needs still lead.
 assert.equal(onslaughtPriorities([farmer],null,{},new Map(),{})[0]!.rows[0]?.resourceBanking,true);
 assert.equal(onslaughtPriorities([blue],{},null,new Map(),{},true)[0]!.rows[0]?.reward.shardType,"Mythic");
 const unknown=onslaughtPriorities([unit("Unknown shards","Chaos",11,null)],null,null,new Map(),{});
 assert.match(unknown[2]!.rows[0]!.reasons[0]!,/unknown/);assert.equal(unknown[2]!.rows[0]!.battles,null);
});

test("Legendary shard goals include covered intermediate steps and rank usefulness before proximity",()=>{
 const distant=unit("Useful raid member","Xenos",8,45);distant.utility={...distant.utility,mainRaidCore:true};
 const near=unit("Near Legendary","Xenos",11,99);
 const intermediate=unit("Next step covered","Xenos",9,80);
 const unknown=unit("Unknown strong character","Xenos",11,null);
 const untracked=unit("Untracked bench","Xenos",9,0);untracked.utility=rateCharacter({...untracked.utility,communityScore:null});
 const group=onslaughtPriorities([near,unknown,intermediate,untracked,distant],{}, {},new Map(),{})[1]!;
 assert.deepEqual(group.rows.map(row=>row.id),[distant.id,near.id,intermediate.id]);
 assert.equal(group.rows[0]!.goalRarity,"Legendary");
 assert.equal(group.rows[0]!.shardsNeeded,300);assert.equal(group.rows[0]!.shardShortfall,255);
 assert.deepEqual(group.rows[0]!.milestone,{from:"Rare",to:"Epic",shardsNeeded:50,shardShortfall:5});
 assert.match(group.rows[0]!.reasons[0]!,/5 shards short of Epic/);
 assert.equal(group.rows[2]!.shardsNeeded,250);assert.equal(group.rows[2]!.shardShortfall,170);
 assert.equal(group.rows[2]!.milestone?.shardShortfall,170);
 const rarePromotions=onslaughtPriorities([{...distant,progressionIndex:6,shards:35}],{}, {},new Map(),{Xenos:{sector:"gold",tier:1}})[1]!.rows[0]!;
 assert.deepEqual(rarePromotions.milestone,{from:"Rare",to:"Epic",shardsNeeded:120,shardShortfall:85});
 assert.deepEqual(rarePromotions.battles,{min:13,max:15});
 const rareCovered=onslaughtPriorities([{...distant,shards:50}],{}, {},new Map(),{Xenos:{sector:"gold",tier:1}})[1]!.rows[0]!;
 assert.equal(rareCovered.shardShortfall,250);assert.equal(rareCovered.milestone?.shardShortfall,0);
 assert.deepEqual(rareCovered.battles,{min:0,max:0});
 assert.match(rareCovered.reasons[0]!,/Epic shards covered/);
 const covered=onslaughtPriorities([{...intermediate,shards:250}],{}, {},new Map(),{})[1]!;
 assert.equal(covered.rows[0]?.futureRarity,true);
 assert.match(covered.rows[0]!.reasons[0]!,/check upgrade costs before honoring/);
 const warOnly={...untracked,progressionIndex:6,shards:0};
 assert.equal(onslaughtPriorities([warOnly],{}, {},new Map([[warOnly.name,26]]),{})[1]!.rows.length,0);
 const gold=onslaughtPriorities([warOnly],{}, {},new Map([[warOnly.name,35]]),{})[1]!.rows[0]!;
 assert.equal(gold.goalRarity,"Epic");assert.equal(gold.shardsNeeded,120);
});

test("Legendary farmers remain useful for known shortages after rarity growth is covered",()=>{
 const ready=unit("Ready recipient","Imperial",11,100),farmer=unit("Established Legendary","Imperial",13,0);
 const group=onslaughtPriorities([farmer,ready],{Imperial:[{rarity:"Legendary",amount:4}]},{},new Map(),{})[0]!;
 assert.deepEqual(group.rows.map(row=>row.id),[ready.id,farmer.id]);
 assert.equal(group.rows[1]!.shardsNeeded,0);assert.equal(group.rows[1]!.orbPool?.shortfall,6);
 const covered=onslaughtPriorities([farmer,ready],{Imperial:[{rarity:"Legendary",amount:10}]},{},new Map(),{})[0]!;
 assert.deepEqual(covered.rows.map(row=>[row.id,row.futureRarity,row.resourceBanking]),[[ready.id,true,false],[farmer.id,false,true]]);
 assert.ok(covered.rows.every(row=>!row.orbPool));
 const unknown=unit("Unknown shards","Imperial",11,null);
 assert.deepEqual(onslaughtPriorities([unknown,farmer,ready],{Imperial:[{rarity:"Legendary",amount:4}]},{},new Map(),{})[0]!.rows.map(row=>row.id),[ready.id,farmer.id,unknown.id]);
});

test("quiet Chaos tracks suggest owned next-rarity projects before optional resource banking",()=>{
 const situational=(name:string,index:number,shards:number|null)=>{
  const row=unit(name,"Chaos",index,shards);
  row.utility=rateCharacter({...row.utility,communityScore:null,warOption:true});
  return row;
 };
 const near=situational("Yazaghor",11,95),far=situational("Wrask",9,0);
 const ready=situational("Macer",8,50),unknown=situational("Unknown",8,null);
 const legendary=unit("Abraxas","Chaos",12,0);
 const groups=onslaughtPriorities([far,unknown,legendary,near,ready],null,null,new Map(),{Chaos:{sector:"gold",tier:1}});
 const chaos=groups[2]!;
 assert.deepEqual(chaos.rows.map(row=>row.id),[ready.id,near.id,far.id]);
 assert.ok(chaos.rows.every(row=>row.futureRarity&&!row.resourceBanking&&!row.orbPool&&!row.badgeNeeds.length));
 assert.deepEqual(chaos.rows[0]!.milestone,{from:"Rare",to:"Epic",shardsNeeded:50,shardShortfall:0});
 assert.match(chaos.rows[0]!.reasons[0]!,/Epic shards covered · check upgrade costs before honoring/);
 assert.equal(chaos.rows[1]!.goalRarity,"Legendary");
 assert.deepEqual(chaos.rows[1]!.battles,{min:1,max:1});
 const banking=onslaughtPriorities([legendary],{Chaos:[{rarity:"Legendary",amount:100}]},{},new Map(),{})[2]!.rows[0]!;
 assert.equal(banking.resourceBanking,true);assert.equal(banking.shardsNeeded,0);
 assert.match(banking.reasons[0]!,/no verified current shortage/);assert.equal(banking.orbPool,undefined);
 const strong={...far,utility:rateCharacter({...far.utility,communityScore:3})};
 assert.equal(onslaughtPriorities([near,ready,strong],null,null,new Map(),{})[2]!.rows[0]!.id,strong.id);
 const warCapped=onslaughtPriorities([ready],{}, {},new Map([[ready.name,26]]),{})[2]!;
 assert.equal(warCapped.rows.length,0); // No fallback growth beyond an active War cap.
 const unranked={...near,utility:rateCharacter({...near.utility,warOption:false})};
 assert.match(onslaughtPriorities([unranked],null,null,new Map(),{})[2]!.rows[0]!.reasons.join(" "),/Usefulness unranked/);
 assert.equal(onslaughtPriorities([{...unranked,shards:100},far],null,null,new Map(),{})[2]!.rows[0]!.id,far.id); // Tracked usefulness beats an unranked easy upgrade.
});

test("regular free shard sources exclude passive farmers without blocking Mythic honors",()=>{
 const ids=["orksRuntherd","orksKillaKan","orksBigMek","eldarAutarch"];
 const free=ids.map(id=>({...unit(id,"Xenos",11,0),utility:rateCharacter({...unit(id).utility,communityScore:4})}));
 const chosen=unit("Scarce useful character","Xenos",9,0);
 const groups=onslaughtPriorities([...free,chosen],{}, {},new Map(),{});
 assert.deepEqual(groups[1]!.rows.map(row=>row.id),[chosen.id]);
 assert.deepEqual(groups[1]!.passive.map(row=>row.id),ids);
 assert.equal(groups[1]!.passive[0]!.source,"Salvage Run strongboxes");
 const orbReady=unit("Orb recipient","Xenos",11,100);
 assert.equal(onslaughtPriorities([{...free[0]!,progressionIndex:13},orbReady],{}, {},new Map(),{})[1]!.rows.some(row=>row.id==="orksRuntherd"),false);
 assert.equal(onslaughtPriorities([{...free[0]!,progressionIndex:15}],{}, {},new Map(),{},false)[1]!.rows.length,0);
 assert.equal(onslaughtPriorities([{...free[0]!,progressionIndex:15}],{}, {},new Map(),{},true)[1]!.rows[0]?.reward.shardType,"Mythic");
 const limited=onslaughtPriorities([chosen],{}, {},new Map(),{})[1]!;
 assert.equal(limited.rows.length,1); // Passive sources still cannot pad the list.
});

test("badge farmers require eligible documented goals or active War slots",()=>{
 const member={...unit("Ability farmer","Imperial",12,1000),activeLevel:34,activeTarget:35};
 assert.equal(onslaughtPriorities([member],{}, {},new Map(),{})[0]!.rows[0]?.resourceBanking,true); // Banking is distinct from an ineligible badge goal.
 const legend={...member,activeLevel:41,activeTarget:44,xpLevel:44};
 assert.equal(onslaughtPriorities([legend],{}, {},new Map(),{})[0]!.rows.length,1);
 assert.equal(onslaughtPriorities([{...legend,xpLevel:41}],{}, {},new Map(),{})[0]!.rows[0]?.badgeNeeds.length,0);
 assert.equal(onslaughtPriorities([{...legend,targetsReviewed:false}],{}, {},new Map(),{})[0]!.rows[0]?.badgeNeeds.length,0);
 const epic={...unit("War badge farmer"),activeLevel:26,passiveLevel:26,targetsReviewed:false,shards:1000};
 assert.equal(onslaughtPriorities([epic],{}, {},new Map(),{})[0]!.rows[0]?.futureRarity,true);
 assert.equal(onslaughtPriorities([epic],{}, {},new Map([[epic.name,35]]),{})[0]!.rows.length,1);
});

test("honor UI separates faction lists, persists manual sectors per account and reveals optional Mythic",async suite=>{
 const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
 const descriptors=new Map<string,PropertyDescriptor|undefined>();
 for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
 const {render,fireEvent,cleanup,act,within}=await import("@testing-library/react");
 suite.after(async()=>{await act(async()=>cleanup());dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
 const rare=unit("Rare upgrade","Imperial",8,45);rare.utility={...rare.utility,mainRaidCore:true};
 const chaosProject=unit("Chaos project","Chaos",8,45);
 chaosProject.utility=rateCharacter({...chaosProject.utility,communityScore:null,warOption:true});
 const candidates=[rare,{...unit("Snotflogga","Xenos",11),id:"orksRuntherd"},unit("Imperial A"),unit("Imperial B"),unit("Imperial C"),unit("Imperial D"),unit("Chaos A","Chaos"),chaosProject,unit("Chaos farmer","Chaos",12),unit("Xenos A","Xenos"),unit("Blue star","Xenos",15)];
 const props={candidates,orbs:{},badges:{},defenseTeams:[],offenseTeams:[],accountKey:"TEST ACCOUNT"};
 const view=render(createElement(HonorPriorities,props));
 assert.equal(within(view.getByRole("table",{name:"Imperial honor priorities"})).getAllByRole("row").length,4);
 assert.equal(view.queryByText("Blue star"),null);
 assert.ok(view.getByText(/one regenerates every 16 hours/));
 assert.ok(view.container.querySelector('[data-resource-id="onslaughtToken"] img'));
 const chaosTable=view.getByRole("table",{name:"Chaos honor priorities"});
 assert.equal(within(chaosTable).getAllByRole("row").length,4);
 assert.match(chaosTable.textContent!,/Next rarity project · 5 shards short of Epic/);
 assert.match(chaosTable.textContent!,/Resource banking · no verified current shortage/);
 const xenos=within(view.getByRole("table",{name:"Xenos honor priorities"}));
 assert.equal(xenos.queryByRole("link",{name:/Snotflogga/}),null);
 const passive=view.getByText("Use regular shard sources instead").closest("details")!;
 assert.equal(passive.hasAttribute("open"),false);
 fireEvent.click(within(passive).getByText("Use regular shard sources instead"));
 assert.ok(within(passive).getByRole("link",{name:"Salvage Run strongboxes"}));
 assert.match(view.getByRole("table",{name:"Imperial honor priorities"}).textContent!,/250 shards short of Legendary/);
 const rareRow=view.getByRole("link",{name:/Rare upgrade/}).closest("tr")!;
 assert.ok(within(rareRow).getByRole("img",{name:"Rare · 1 red star"}));
 assert.equal(rareRow.querySelectorAll('[src="/progression/red-star.png"]').length,1);
 assert.match(rareRow.textContent!,/Rare → Epic/);
 assert.match(rareRow.textContent!,/5 shards short of Epic/);
 assert.match(rareRow.textContent!,/45 \/ 50 shards for Epic/);
 assert.doesNotMatch(rareRow.textContent!,/6 stars/);
 const goal=within(rareRow).getByText(/Legendary goal: 45 \/ 300 total shards/).closest("details")!;
 assert.equal(goal.hasAttribute("open"),false);
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
