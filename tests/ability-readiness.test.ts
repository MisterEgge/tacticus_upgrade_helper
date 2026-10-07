import assert from "node:assert/strict";
import test from "node:test";
import {abilityReadiness} from "../src/domain/abilityReadiness";
import {abilityLevelCap,abilityRarityCaps,badgeCostBetween} from "../src/domain/abilityCosts";

const progress={level:41,target:44,xpLevel:44,rarity:"Legendary",alliance:"Chaos"};
test("ability next steps distinguish badge shortfall, covered badges, and missing inventory without promising coins",()=>{
 const short=abilityReadiness(progress,{Chaos:[{rarity:"Legendary",amount:2}]});
 assert.equal(short.state,"BADGES NEEDED");assert.equal(short.nextLevel,42);assert.deepEqual(short.nextCost,{Legendary:3});assert.equal(short.badges[0]!.shortfall,1);
 assert.equal(abilityReadiness(progress,{Chaos:[{rarity:"Legendary",amount:3}]}).state,"LEVEL ELIGIBLE");
 assert.equal(abilityReadiness(progress,null).state,"CHECK BADGES");
 assert.equal(abilityReadiness({...progress,alliance:"Unknown"},{Chaos:[]}).badges[0]!.owned,null);
 assert.equal(abilityReadiness({...progress,alliance:"Imperium"},{Imperial:[{rarity:"Legendary",amount:3}]}).state,"LEVEL ELIGIBLE");
});
test("XP and rarity gate the next level independently, not just the long-term target",()=>{
 const xp=abilityReadiness({...progress,xpLevel:41},{Chaos:[{rarity:"Legendary",amount:99}]});
 assert.equal(xp.state,"GATED");assert.deepEqual(xp.gates,["Level character to 42"]);assert.deepEqual(xp.eligible,{});
 const both=abilityReadiness({...progress,level:35,xpLevel:35,rarity:"Epic"},null);
 assert.equal(both.state,"GATED");assert.deepEqual(both.gates,["Level character to 36","Ascend to Legendary"]);
 const partial=abilityReadiness({...progress,level:34,xpLevel:41,rarity:"Epic"},{Chaos:[{rarity:"Epic",amount:5}]});
 assert.equal(partial.state,"LEVEL ELIGIBLE");assert.equal(partial.nextLevel,35);assert.equal(partial.reachable,35);assert.deepEqual(partial.eligible,{Epic:5});assert.deepEqual(partial.planned,badgeCostBetween(34,44));
});
test("all rarity boundaries share the budget and raid cap policy, including Legendary star and Mythic",()=>{
 for(const [rarity,cap] of Object.entries(abilityRarityCaps)){
  assert.equal(abilityLevelCap(rarity),cap);
  if(cap===60)continue;
  const result=abilityReadiness({level:cap,target:cap+1,xpLevel:60,rarity,alliance:"Xenos"},{Xenos:[]});
  assert.equal(result.state,"GATED");assert.ok(result.gates[0]!.startsWith("Ascend to "));
 }
 assert.equal(abilityReadiness({level:59,target:60,xpLevel:60,rarity:"Mythic",alliance:"Xenos"},{Xenos:[{rarity:"Mythic",amount:5}]}).state,"LEVEL ELIGIBLE");
 assert.equal(abilityLevelCap("toString"),null);
});
test("met, missing, locked and unsupported targets never become false upgrade actions",()=>{
 assert.equal(abilityReadiness({...progress,level:44},null).state,"TARGET MET");
 for(const update of [{level:null},{level:0},{level:61},{target:NaN},{target:61},{xpLevel:0},{rarity:"Unknown"}])assert.equal(abilityReadiness({...progress,...update},{}).state,"UNKNOWN");
 assert.deepEqual(abilityReadiness({...progress,level:null},{}).planned,{});
});
