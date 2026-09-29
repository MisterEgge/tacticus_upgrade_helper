import test from "node:test";
import assert from "node:assert/strict";
import { budgetForRow, eligibleForBudget, type BudgetRow } from "../src/domain/abilityBudget";

const row:BudgetRow={id:"one",name:"One",alliance:"Imperial",rank:9,rarity:"Uncommon",xpLevel:12,activeLevel:8,passiveLevel:17,activeTarget:35,passiveTarget:35,reviewed:true,recommended:true,communityScore:3,accountPriority:0,mainRaid:false};

test("budget excludes low-utility roster and retains a selected raid member",()=>{
    assert.equal(eligibleForBudget({...row,communityScore:null},"useful",0),false);
    assert.equal(eligibleForBudget({...row,communityScore:null,mainRaid:true},"useful",0),true);
    assert.equal(eligibleForBudget(row,"useful",12),false);
    assert.equal(eligibleForBudget(row,"top",0),false);
});

test("planned badges stop at target, while level-eligible badges stop at XP and rarity",()=>{
    const result=budgetForRow(row,17);
    assert.equal(result.planned.Uncommon,21);
    assert.equal(result.eligible.Uncommon,5);
    assert.equal(result.planned.Common,undefined);
    assert.deepEqual(budgetForRow({...row,activeLevel:20,passiveLevel:25},17).planned,{});
});
