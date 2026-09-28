import assert from "node:assert/strict";
import test from "node:test";
import {raidTargetBasis} from "../src/domain/raidTargetBasis";

test("raid table distinguishes raid guidance from another mode's guidance",()=>{
    assert.equal(raidTargetBasis(["Guild Raid","Campaign"],"high"),"Guild Raid guidance");
    assert.equal(raidTargetBasis(["Campaign","LRE"],"high"),"General target · no Guild Raid evidence");
    assert.equal(raidTargetBasis([],"planning"),"Editorial planning target · raid stop unverified");
    assert.equal(raidTargetBasis(undefined,undefined),"Target needs research");
});
