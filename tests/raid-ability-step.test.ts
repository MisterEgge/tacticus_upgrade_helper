import assert from "node:assert/strict";
import test from "node:test";
import {raidAbilityStep} from "../src/domain/raidAbilityStep";

test("raid ability step respects both XP and rarity",()=>{
    assert.match(raidAbilityStep(16,"35",41,"Uncommon"),/16 → 17.*rarity/);
    assert.match(raidAbilityStep(17,"35",41,"Uncommon"),/rarity above Uncommon/);
    assert.match(raidAbilityStep(20,"44",20,"Legendary"),/XP for level 21/);
    assert.match(raidAbilityStep(20,"44",41,"Legendary"),/20 → 41.*XP/);
});

test("unknown and already met targets never claim an upgrade is ready",()=>{
    assert.equal(raidAbilityStep(null,"35",null,null),"Future option · not owned");
    assert.equal(raidAbilityStep(20,"17",30,"Epic"),"At suggested first stop");
    assert.match(raidAbilityStep(10,"35",20,"Unknown"),/verify in game/);
});
