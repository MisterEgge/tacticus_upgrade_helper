import assert from "node:assert/strict";
import test from "node:test";
import {epicUpgradeItemId} from "../src/domain/equipmentTier";

test("Epic option derives only from a known lower-rarity item in the same family",()=>{
    assert.equal(epicUpgradeItemId("Rare","I_Defensive_R001"),"I_Defensive_E001");
    assert.equal(epicUpgradeItemId("Uncommon","I_Crit_U011"),"I_Crit_E011");
    assert.equal(epicUpgradeItemId("Epic","I_Defensive_E001"),null);
    assert.equal(epicUpgradeItemId("Rare",undefined),null);
    assert.equal(epicUpgradeItemId("Rare","unrecognized"),null);
});
