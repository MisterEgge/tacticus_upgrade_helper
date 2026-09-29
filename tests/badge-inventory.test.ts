import test from "node:test";
import assert from "node:assert/strict";
import {badgeShortfalls,badgesOwned} from "../src/domain/badgeInventory";

test("badges are matched by grand alliance and rarity, combining inventory stacks",()=>{
    const inventory={Imperium:[{rarity:"Uncommon",amount:6}],Imperial:[{rarity:"Uncommon",amount:4},{rarity:"Rare",amount:2}],Chaos:[]};
    assert.equal(badgesOwned(inventory,"Imperial","Uncommon"),10);
    assert.equal(badgesOwned(inventory,"Chaos","Uncommon"),0);
    assert.equal(badgesOwned(inventory,"Xenos","Uncommon"),0);
    assert.equal(badgesOwned(null,"Imperial","Uncommon"),null);
    assert.deepEqual(badgeShortfalls(inventory,"Imperial",{Uncommon:12,Rare:1},{Uncommon:5,Rare:1}).map(row=>[row.rarity,row.owned,row.shortfall,row.shortfallNow]),[["Uncommon",10,2,0],["Rare",2,0,0]]);
});

test("missing badge export is unknown, not zero",()=>{
    const [row]=badgeShortfalls(undefined,"Chaos",{Uncommon:20},{Uncommon:4});
    assert.equal(row?.owned,null);
    assert.equal(row?.shortfall,null);
    assert.equal(row?.needed,20);
});
