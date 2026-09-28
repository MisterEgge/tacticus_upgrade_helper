import assert from "node:assert/strict";
import test from "node:test";
import {tierUpgradeItemId} from "../src/domain/equipmentTier";

const catalog={I_Defensive_C001:{type:"I_Defensive",rarity:"Common"},I_Defensive_U001:{type:"I_Defensive",rarity:"Uncommon"},I_Defensive_R001:{type:"I_Defensive",rarity:"Rare"},I_Defensive_E001:{type:"I_Defensive",rarity:"Epic"},I_Defensive_L001:{type:"I_Defensive",rarity:"Legendary"}};

test("target rarity derives only from a catalog-proven same-family item",()=>{
    assert.equal(tierUpgradeItemId("Common","I_Defensive_C001","Uncommon",catalog),"I_Defensive_U001");
    assert.equal(tierUpgradeItemId("Common","I_Defensive_C001","Rare",catalog),"I_Defensive_R001");
    assert.equal(tierUpgradeItemId("Rare","I_Defensive_R001","Epic",catalog),"I_Defensive_E001");
    assert.equal(tierUpgradeItemId("Epic","I_Defensive_E001","Legendary",catalog),"I_Defensive_L001");
    assert.equal(tierUpgradeItemId("Epic","I_Defensive_E001","Rare",catalog),null);
    assert.equal(tierUpgradeItemId("Rare",undefined,"Epic",catalog),null);
    assert.equal(tierUpgradeItemId("Rare","unrecognized","Epic",catalog),null);
    assert.equal(tierUpgradeItemId("Rare","I_Defensive_R001","Epic",{...catalog,I_Defensive_E001:{type:"I_Crit",rarity:"Epic"}}),null);
});
