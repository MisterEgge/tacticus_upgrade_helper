import assert from "node:assert/strict";
import test from "node:test";
import {abilityTargetMet,formatAbilityTarget} from "../src/domain/targetDisplay";

test("met ability targets never render a backwards or equal arrow",()=>{
    assert.equal(formatAbilityTarget(41,"36"),"Target met");
    assert.equal(formatAbilityTarget(20,17),"Target met");
    assert.equal(formatAbilityTarget(35,"26-35"),"Target met");
    assert.equal(formatAbilityTarget(17,"17"),"Target met");
    assert.equal(abilityTargetMet(20,"17"),true);
});

test("unmet and unknown targets stay distinct",()=>{
    assert.equal(formatAbilityTarget(20,"36"),"20 → 36");
    assert.equal(formatAbilityTarget(null,"36"),"Current unknown · target 36");
    assert.equal(formatAbilityTarget(20,"RESEARCHING"),"Target needs research");
    assert.equal(abilityTargetMet(null,"17"),false);
});
