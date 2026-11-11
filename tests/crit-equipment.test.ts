import assert from "node:assert/strict";
import test from "node:test";
import shops from "../data/game/shops.json";
import characters from "../data/game/equipment-characters.json";
import {allocateEquipment} from "../src/domain/equipment";
import {preferredActOfFaithCritItemId} from "../src/domain/critEquipment";
import {equipmentUpgradeOptions} from "../src/domain/equipmentOptions";
import type {EquipmentDefinition} from "../src/domain/equipmentCompatibility";

const equipment=shops.equipment as Record<string,EquipmentDefinition>;
const vindicta=characters.characters.find(character=>character.id==="adeptRetributor")!;

test("Act of Faith prefers compatible crit gear with higher crit damage",()=>{
 assert.equal(vindicta.name,"Vindicta");
 assert.ok(vindicta.traits?.includes("ActOfFaith"));
 assert.equal(preferredActOfFaithCritItemId(vindicta,vindicta.traits??[],vindicta.equipment,"Legendary","I_Crit_L002",equipment),"I_Crit_L001");
 assert.equal(preferredActOfFaithCritItemId(vindicta,vindicta.traits??[],vindicta.equipment,"Legendary","I_Crit_L001",equipment),null);
 assert.equal(preferredActOfFaithCritItemId(vindicta,[],vindicta.equipment,"Legendary","I_Crit_L002",equipment),null);
});

test("Act of Faith crit preference participates in shared rarity upgrade options",()=>{
 const unit={id:vindicta.id,faction:vindicta.faction,rarity:"Legendary"};
 const options=equipmentUpgradeOptions(unit,{equipment:vindicta.equipment,traits:vindicta.traits??[]},{id:"I_Crit_L002",rarity:"Legendary"},equipment);
 assert.deepEqual(options,[{id:"I_Crit_L001",rarity:"Legendary",reason:"Preferred crit damage · Act of Faith"}]);
});

test("Act of Faith recommendation is carried into the account equipment allocation",()=>{
 const unit={id:vindicta.id,name:vindicta.name,faction:vindicta.faction,progressionIndex:15,items:[{slotId:"Slot1" as const,id:"I_Crit_L002",rarity:"Legendary",level:11}]};
 const allocation=allocateEquipment([unit],[],{}, {characters:{}},{characters:{}},{},equipment,characters.characters);
 assert.deepEqual(allocation.buyWatch[0]?.preferredLegendaryItemIds,["I_Crit_L001"]);
 const ready=allocateEquipment([unit],[{id:"I_Crit_L001",amount:1,level:11}],{}, {characters:{}},{characters:{}},{},equipment,characters.characters);
 assert.equal(ready.equipNow[0]?.recommendedItemId,"I_Crit_L001");
});
