import test from "node:test";
import assert from "node:assert/strict";
import {allocateEquipmentActions} from "../src/domain/equipmentActions";
const make=(character:string,slotId:string,id:string,state="NEED",rarity="Legendary")=>({character,slotId,state,itemRarity:rarity,accountPriority:10,acquisition:[{id}]});

test("nine unrefined Halos reserve two copies for two recipients, not nine per recipient",()=>{
 const options=[{...make("Azrael","Slot2","halo","NEED","Epic"),minimumLevel:4},{...make("Baldr","Slot2","halo","NEED","Epic"),minimumLevel:5}];
 const result=allocateEquipmentActions(options,[{id:"halo",level:1,amount:9}]);
 assert.deepEqual(result.map(row=>[row.state,row.allocatedItemId,row.allocatedLevel,row.copiesToLevel]),[["LEVEL INVENTORY","halo",1,1],["LEVEL INVENTORY","halo",1,1]]);
 const scarce=allocateEquipmentActions([{...options[0]!,raidPriority:true},options[1]!],[{id:"halo",level:1,amount:1}]);
 assert.deepEqual(scarce.map(row=>row.state),["LEVEL INVENTORY","NEED"]);
});

test("one slot cannot reserve both a ready replacement and a future refinement",()=>{
 const result=allocateEquipmentActions([make("A","Slot2","ready"),{...make("A","Slot2","halo"),minimumLevel:5}],[{id:"ready",level:2,amount:1},{id:"halo",level:1,amount:9}]);
 assert.deepEqual(result.map(row=>row.state),["EQUIP NOW","NEED"]);
 assert.equal(result.reduce((sum,row)=>sum+row.copiesToLevel,0),0);
});

test("selected Raid recipients get shared inventory before static priorities and old report assignments",()=>{
 const old={...make("Old priority","Slot1","knife","EQUIP NOW"),accountPriority:100};
 const raid={...make("Selected Raid","Slot1","knife"),accountPriority:0,raidPriority:true};
 const result=allocateEquipmentActions([old,raid],[{id:"knife",amount:1,level:4}]);
 assert.deepEqual(result.filter(row=>row.state==="EQUIP NOW").map(row=>row.character),["Selected Raid"]);
 assert.equal(result[1]!.allocatedLevel,4);assert.equal(result[0]!.state,"NEED");
 assert.equal(result[0]!.freeCopies,0);
 const changed=allocateEquipmentActions([{...old,raidPriority:true},{...raid,raidPriority:false}],[{id:"knife",amount:1,level:4}]);
 assert.deepEqual(changed.filter(row=>row.state==="EQUIP NOW").map(row=>row.character),["Old priority"]);
});

test("invalid inventory levels cannot produce equip-now promises",()=>{
 const result=allocateEquipmentActions([make("A","Slot1","knife"),make("B","Slot1","knife")],[
  ...[0,-1,1.5,Infinity,NaN].map(level=>({id:"knife",amount:1,level})),{id:"knife",amount:1,level:2}
 ]);
 assert.equal(result.filter(row=>row.state==="EQUIP NOW").length,1);
 assert.equal(result[0]!.allocatedLevel,2);assert.equal(result[1]!.freeCopies,0);
});

test("equipment readiness reserves shared stock once, preserves confirmed allocations and chooses one best option per slot",()=>{
 const result=allocateEquipmentActions([
  make("A","Slot1","knife"),make("B","Slot1","knife","EQUIP NOW"),
  make("Rho","Slot2","epic-mantle","NEED","Epic"),make("Rho","Slot2","legendary-mantle"),
  make("Rho","Slot3","legendary-mantle"),make("Unknown","Slot1","unknown","UNKNOWN"),
  make("Stale","Slot1","missing","EQUIP NOW"),make("Level","Slot1","level","LEVEL UP","Epic")
 ],[{id:"knife",amount:1},{id:"legendary-mantle",amount:1},{id:"epic-mantle",amount:1},{id:"unknown",amount:1},{id:"level",amount:1}]);
 assert.deepEqual(result.filter(row=>row.state==="EQUIP NOW").map(row=>[row.character,row.slotId,row.allocatedItemId]),[["B","Slot1","knife"],["Rho","Slot2","legendary-mantle"]]);
 assert.equal(result[0]!.freeCopies,0);
 assert.equal(result[2]!.freeCopies,1);
 assert.equal(result[6]!.state,"NEED");
 assert.equal(result[7]!.state,"LEVEL UP");
});

test("equipment readiness selects the actual available item from alternatives and aggregates inventory stacks",()=>{
 const a={...make("A","Slot1","first"),acquisition:[{id:"first"},{id:"second"}],recommendedItemId:"first"};
 const result=allocateEquipmentActions([a,make("B","Slot1","second"),make("C","Slot1","second")],[{id:"second",amount:1},{id:"second",amount:1},{id:"first",amount:-1}]);
 assert.equal(result[0]!.allocatedItemId,"second");
 assert.equal(result.filter(row=>row.state==="EQUIP NOW").length,2);
 assert.equal(result[2]!.freeCopies,0);
});
