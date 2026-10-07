import assert from "node:assert/strict";
import test from "node:test";
import {inventoryCleanout} from "../src/domain/inventoryCleanout";
import type {EquipmentCharacter,EquipmentDefinition} from "../src/domain/equipmentCompatibility";
const chars:EquipmentCharacter[]=[{id:"a",name:"A",faction:"Faction",equipment:["I_Test"]},{id:"b",name:"B",faction:"Faction",equipment:["I_Test"]}];
const eq:Record<string,EquipmentDefinition>=Object.fromEntries(["Rare","Epic","Legendary"].map((rarity,index)=>[`I_Test_${["R","E","L"][index]}001`,{type:"I_Test",rarity,name:rarity,allowedFactions:["Faction"],baseStats:{},statsByLevel:Array.from({length:11},()=>({}))}]));
const unit=(id="a",index=12,item="I_Test_E001",level=1)=>({id,name:id.toUpperCase(),progressionIndex:index,items:[{slotId:"Slot1",id:item,level}]});

test("cleanout uses exact faction/unit restrictions rather than every character with the same equipment type",()=>{
 const [row]=inventoryCleanout([{id:"I_Test_R001",level:1,amount:4}],[unit()],[],[chars[0]!,{...chars[1]!,faction:"Other"}],eq);
 assert.equal(row!.status,"SCRAP SAFE");assert.equal(row!.scrap,4);assert.deepEqual(row!.recipients.map(r=>r.id),["a"]);
 const [specific]=inventoryCleanout([{id:"I_Test_R001",level:1,amount:4}],[unit()],[],chars,{...eq,I_Test_R001:{...eq.I_Test_R001!,allowedFactions:[],allowedUnits:["a"]}});
 assert.equal(specific!.scrap,4);
});

test("locked recipients get explicit future reserves; owned-roster scope excludes them without claiming permanence",()=>{
 const items=[{id:"I_Test_R001",level:1,amount:4}];
 const [full]=inventoryCleanout(items,[unit()],[],chars,eq);
 const [owned]=inventoryCleanout(items,[unit()],[],chars,eq,{reserveLocked:false});
 assert.equal(full!.keep,1);assert.equal(full!.scrap,3);assert.equal(full!.futureReserve,1);
 assert.equal(owned!.scrap,4);assert.equal(owned!.futureReserve,0);assert.equal(owned!.futureRecipients,1);
 assert.match(owned!.reason,/excluded by your scope/);
});

test("future ascensions reserve higher-tier gear even before the character can equip it; index 15 remains Legendary",()=>{
 const [row]=inventoryCleanout([{id:"I_Test_L001",level:1,amount:3}],[unit("a",6),unit("b",15)],[],chars,eq);
 assert.equal(row!.keep,2);assert.equal(row!.scrap,1);
 assert.match(row!.recipients[0]!.reason,/Future ascension/);
});

test("missing exact compatibility, level stats and catalog coverage never yield salvage candidates",()=>{
 const items=[{id:"I_Test_R001",level:1,amount:8}];
 const cases=[inventoryCleanout(items,[],[],chars,{}),inventoryCleanout(items,[],[],[],eq),inventoryCleanout(items,[],[],chars,{...eq,I_Test_R001:{...eq.I_Test_R001!,allowedFactions:[]}}),inventoryCleanout([{...items[0]!,level:99}],[unit()],[],chars,eq)];
 for(const rows of cases){assert.equal(rows[0]!.status,"UNKNOWN — DO NOT SCRAP");assert.equal(rows[0]!.keep,8);assert.equal(rows[0]!.scrap,0);}
});

test("different copy levels stay separate; allocated copies and higher-level upgrades are protected",()=>{
 const [row]=inventoryCleanout([{id:"I_Test_R001",level:1,amount:3},{id:"I_Test_R001",level:7,amount:1},{id:"I_Test_R001",level:1,amount:2}],[unit("a",12,"I_Test_R001",1)],[{characterId:"a",slotId:"Slot1",allocatedItemId:"I_Test_R001",allocatedLevel:7},{characterId:"a",slotId:"Slot1",allocatedItemId:"I_Test_R001",allocatedLevel:7}],[chars[0]!],eq);
 assert.equal(row!.amount,6);assert.equal(row!.planned,1);assert.equal(row!.keep,1);assert.equal(row!.scrap,5);
 assert.deepEqual(row!.stacks.map(s=>[s.level,s.amount,s.keep,s.scrap,s.allocated]),[[7,1,1,0,1],[1,5,0,5,0]]);
});

test("already-covered leveled copies are retained for manual review instead of automatically salvaged",()=>{
 const [row]=inventoryCleanout([{id:"I_Test_R001",level:7,amount:2},{id:"I_Test_R001",level:1,amount:3}],[unit()],[],[chars[0]!],eq);
 assert.equal(row!.invested,2);assert.equal(row!.keep,2);assert.equal(row!.scrap,3);assert.match(row!.reason,/leveled surplus/);
});

test("a same-rarity preferred block replacement is reserved; lower-chance blocks remain manual situational choices",async()=>{
 const shops=(await import("../data/game/shops.json")).default;
 const character:EquipmentCharacter={id:"a",name:"A",faction:"ThousandSons",equipment:["I_Block"],traits:[]};
 const u=unit("a",15,"I_Block_L006",3);
 const rows=inventoryCleanout([{id:"I_Block_L003",level:1,amount:2},{id:"I_Block_E006",level:1,amount:2}],[u],[],[character],shops.equipment);
 const shield=rows.find(row=>row.id==="I_Block_L003")!;
 assert.equal(shield.ownedReserve,1);assert.equal(shield.keep,1);assert.equal(shield.scrap,1);assert.match(shield.recipients[0]!.reason,/Preferred block/);
 const sigil=rows.find(row=>row.id==="I_Block_E006")!;
 assert.equal(sigil.status,"SITUATIONAL — REVIEW");assert.equal(sigil.scrap,0);
});
