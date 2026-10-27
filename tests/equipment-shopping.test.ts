import test from "node:test";
import assert from "node:assert/strict";
import {groupEquipmentShopping} from "../src/domain/equipmentShopping";

test("shopping quantities count distinct recipient slots, not repeated rows or shop offers",()=>{
 const source={id:"pauldron",name:"Pauldron",offers:[{id:"shop1"},{id:"shop2"}]};
 const first={character:"First",characterId:"first",slotId:"Slot2"},second={character:"Second",characterId:"second",slotId:"Slot2"};
 const groups=groupEquipmentShopping([{slot:first,source},{slot:first,source},{slot:second,source},{slot:{...second,slotId:"Slot3"},source}]);
 assert.equal(groups.length,1);assert.equal(groups[0]!.members.length,3);assert.equal(groups[0]!.offers.length,2);
});
test("different item alternatives retain separate counts and empty inputs stay empty",()=>{
 const slot={character:"One",slotId:"Slot2"};
 const groups=groupEquipmentShopping([{slot,source:{id:"epic",name:"Epic",offers:[]}},{slot,source:{id:"legendary",name:"Legendary",offers:[]}}]);
 assert.deepEqual(groups.map(group=>[group.id,group.members.length]),[["epic",1],["legendary",1]]);
 assert.deepEqual(groupEquipmentShopping([]),[]);
});

test("offer IDs reused by different shops do not lose buying routes",()=>{
 const slot={character:"One",slotId:"Slot2"};
 const groups=groupEquipmentShopping([{slot,source:{id:"item",name:"Item",offers:[{id:"same",shop:"First"},{id:"same",shop:"Second"}]}}]);
 assert.equal(groups[0]!.offers.length,2);
});
