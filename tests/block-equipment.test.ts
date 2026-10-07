import assert from "node:assert/strict";
import test from "node:test";
import shops from "../data/game/shops.json";
import {preferredBlockItemId,minimumBlockReplacementLevel,expectedBlockReduction} from "../src/domain/blockEquipment";
import {equipmentUpgradeOptions} from "../src/domain/equipmentOptions";
import {allocateEquipmentActions} from "../src/domain/equipmentActions";
import {allocateEquipment} from "../src/domain/equipment";
import pool from "../data/game/equipment-characters.json";

const unit={id:"thousInfernalMaster",faction:"ThousandSons",rarity:"Legendary"};
const character={traits:[],equipment:["I_Block"]};
test("higher-chance block preferences use actual stats and exact restrictions without recommending lower-tier replacements",()=>{
 assert.equal(preferredBlockItemId(unit,character.equipment,"Legendary","I_Block_L006",shops.equipment),"I_Block_L003");
 assert.equal(preferredBlockItemId(unit,character.equipment,"Epic","I_Block_L006",shops.equipment),null);
 assert.equal(preferredBlockItemId(unit,character.equipment,"Legendary","I_Block_L003",shops.equipment),null);
 assert.equal(preferredBlockItemId({id:"ultraCalgar",faction:"Ultramarines"},character.equipment,"Epic","I_Block_E003",shops.equipment),"I_Block_E004");
 assert.deepEqual(equipmentUpgradeOptions(unit,character,{id:"I_Block_L006",rarity:"Legendary"},shops.equipment).map(option=>option.id),["I_Block_L003"]);
 assert.ok(expectedBlockReduction(30,711)>expectedBlockReduction(20,1052));
});
test("refinement thresholds and inventory allocation prevent a fresh high-chance shield replacing heavily leveled gear",()=>{
 const minimum=minimumBlockReplacementLevel({id:"I_Block_L006",level:11},"I_Block_L003",shops.equipment)!;
 assert.ok(minimum>1);
 const candidate={character:"Abraxas",slotId:"Slot2",state:"NEED",itemRarity:"Legendary",accountPriority:100,minimumLevel:minimum,acquisition:[{id:"I_Block_L003"}]};
 const rows=allocateEquipmentActions([candidate,{...candidate,character:"Other"}],[{id:"I_Block_L003",level:1,amount:2},{id:"I_Block_L003",level:minimum,amount:1}]);
 assert.equal(rows[0]!.state,"EQUIP NOW");assert.equal(rows[0]!.allocatedLevel,minimum);
 assert.equal(rows[1]!.state,"LEVEL INVENTORY");assert.equal(rows[1]!.copiesToLevel,2);
 assert.equal(minimumBlockReplacementLevel({id:"I_Block_L006",level:99},"I_Block_L003",shops.equipment),null);
});
test("the generated report shares preferences and consumes each adequately leveled shield only once",()=>{
 const u={id:unit.id,name:"Abraxas",faction:unit.faction,progressionIndex:15,items:[{slotId:"Slot2" as const,id:"I_Block_L006",rarity:"Legendary",level:11}]};
 const second={...u,id:"thousSorcerer",name:"Thaumachus"};
 const result=allocateEquipment([u,second],[{id:"I_Block_L003",amount:1,level:11},{id:"I_Block_L003",amount:5,level:1}],{}, {characters:{}},{characters:{}},{},shops.equipment,pool.characters);
 assert.equal(result.equipNow.length,1);assert.equal(result.equipNow[0]!.recommendedItemId,"I_Block_L003");assert.equal(result.equipNow[0]!.allocatedLevel,11);
 assert.equal(result.buyWatch.length,1);assert.deepEqual(result.buyWatch[0]!.preferredLegendaryItemIds,["I_Block_L003"]);
});
