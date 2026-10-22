import assert from "node:assert/strict";
import test from "node:test";
import {inventoryBalances} from "../src/domain/inventoryBalance";
import {rankAccountActions} from "../src/domain/dashboard";

test("inventory totals all stacks once and retains refinement levels",()=>{
 const rows=inventoryBalances([{id:"item",amount:2,level:1},{id:"item",amount:2,level:5},{id:"item",amount:1,level:5}],Array.from({length:4},(_,i)=>({itemId:"item",itemName:"Item",character:`unit${i}`,priority:i})));
 assert.equal(rows.length,1);
 assert.equal(rows[0]!.amount,5);
 assert.equal(rows[0]!.net,1);
 assert.deepEqual(rows[0]!.levels,[{level:5,amount:3},{level:1,amount:2}]);
 assert.equal(rows[0]!.recipients[0]!.character,"unit3");
});
test("missing inventory creates a shortage",()=>{
 assert.equal(inventoryBalances([],[{itemId:"item",itemName:"Item",character:"Unit",priority:1}])[0]!.net,-1);
});
test("Raid blockers precede ready off-team actions and completed units disappear",()=>{
 const rows=rankAccountActions([{name:"Other",actions:[{ready:true}]},{name:"Raid",actions:[{ready:false}]},{name:"Done",actions:[]}],new Set(["Raid"]));
 assert.deepEqual(rows.map(row=>row.name),["Raid","Other"]);
});
