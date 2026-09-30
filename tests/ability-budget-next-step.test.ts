import test from "node:test";
import assert from "node:assert/strict";
import {abilityBudgetNextStep} from "../src/domain/abilityBudgetNextStep";
const row={activeLevel:20,passiveLevel:9,activeTarget:17,passiveTarget:17,xpLevel:26,rarity:"Rare"};
test("next step ignores already-met active targets and names the accessible passive upgrade",()=>assert.equal(abilityBudgetNextStep(row),"Passive to 17"));
test("next step names the next character level when XP blocks abilities",()=>assert.equal(abilityBudgetNextStep({...row,activeLevel:41,activeTarget:44,passiveLevel:44,passiveTarget:44,xpLevel:41,rarity:"Legendary"}),"Level character to 42"));
test("next step identifies rarity gating and missing data",()=>{
 assert.equal(abilityBudgetNextStep({...row,activeLevel:35,activeTarget:44,passiveLevel:44,passiveTarget:44,xpLevel:41,rarity:"Epic"}),"Ascend to Legendary");
 assert.equal(abilityBudgetNextStep({...row,activeLevel:null}),"Sync ability levels");
 assert.equal(abilityBudgetNextStep({...row,passiveLevel:20}),"Target met");
});
