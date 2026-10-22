import assert from "node:assert/strict";
import test from "node:test";
import {gearRoles,planLegendaryReallocation,type ReallocationUnit,type ReallocationTarget} from "../src/domain/legendaryReallocation";
import type {EquipmentCharacter,EquipmentDefinition} from "../src/domain/equipmentCompatibility";

const legendary="I_Crit_L006",epic="I_Crit_E006";
const unit=(name:string,itemId=legendary,level=1):ReallocationUnit=>({id:name,name,rarity:"Legendary",items:[{slotId:"Slot1",id:itemId,level,rarity:itemId===legendary?"Legendary":"Epic"}]});
const target=(name:string):ReallocationTarget=>({character:name,characterId:name,slotId:"Slot1",itemId:legendary,minimumLevel:1,inventoryReady:false});
const characters=(units:ReallocationUnit[]):EquipmentCharacter[]=>units.map(unit=>({id:unit.id,name:unit.name,faction:"Allowed",equipment:["I_Crit"]}));
const equipment:Record<string,EquipmentDefinition>={[legendary]:{name:"Legendary pistol",rarity:"Legendary",type:"I_Crit",allowedFactions:["Allowed"]},[epic]:{name:"Epic pistol",rarity:"Epic",type:"I_Crit",allowedFactions:["Allowed"]}};
const roles=(overrides:Partial<Parameters<typeof gearRoles>[0]>={})=>gearRoles({raidNames:[],raidOptions:[],warNames:[],campaignNames:[],campaignUnknown:[],focus:{},...overrides});

test("selected Raid, recorded Raid flex such as Aesoth, saved War, campaign and planned roles protect holders",()=>{
 const units=["Raid","Aesoth","War","Campaign","Unknown campaign","LRE","Donor"].map(name=>unit(name));
 const result=planLegendaryReallocation({units,targets:[target("Recipient")],characters:characters(units),equipment,roles:roles({raidNames:["Raid"],raidOptions:["Raid","Aesoth"],warNames:["War"],campaignNames:["Campaign"],campaignUnknown:["Unknown campaign"],focus:{LRE:{modes:["LRE"]}}})});
 assert.deepEqual(result.protectedGear.map(row=>row.character),units.slice(0,6).map(row=>row.name));
 assert.equal(result.protectedGear.find(row=>row.character==="Aesoth")?.reason,"Raid team option");
 assert.equal(result.transfers.length,0);
 assert.equal(result.review[0]?.character,"Donor");
 assert.match(result.review[0]!.action,/Keep equipped/);
});

test("one shared copy serves the selected Raid recipient before War and each recipient slot only once",()=>{
 const units=[unit("Donor"),unit("Raid",epic),unit("War",epic)];
 const result=planLegendaryReallocation({units,targets:[target("War"),target("Raid"),target("Raid")],characters:characters(units),equipment,roles:roles({raidNames:["Raid"],warNames:["War"]})});
 assert.equal(result.transfers.length,1);
 assert.equal(result.transfers[0]!.recipient,"Raid");
 assert.equal(result.transfers[0]!.replacesId,epic);
 assert.equal(result.review.length,0);
});

test("multiple donors never suggest two items for the same recipient slot",()=>{
 const units=[unit("First",legendary,1),unit("Second",legendary,3),unit("Raid",epic)];
 const result=planLegendaryReallocation({units,targets:[target("Raid"),target("Raid")],characters:characters(units),equipment,roles:roles({raidNames:["Raid"]})});
 assert.equal(result.transfers.length,1);
 assert.equal(result.transfers[0]!.character,"Second");
 assert.equal(result.review[0]!.character,"First");
});

test("a ready inventory replacement prevents stripping an equipped donor",()=>{
 const units=[unit("Donor"),unit("Raid",epic)];
 const result=planLegendaryReallocation({units,targets:[{...target("Raid"),inventoryReady:true},target("Raid")],characters:characters(units),equipment,roles:roles({raidNames:["Raid"]})});
 assert.equal(result.transfers.length,0);
 assert.match(result.review[0]!.action,/Keep equipped/);
});

test("incompatible or unknown restrictions, rarity gates, wrong slots and unresolved targets cannot authorize transfers",()=>{
 for(const change of ["restriction","unknown restriction","rarity","slot","unknown item","same item","no role","unknown character","stale name","minimum level","mythic"]){
  const units=[unit("Donor"),unit("Raid",epic)];
  const definitions=structuredClone(equipment),targets=[target("Raid")];
  const chars=characters(units);
  let active=roles({raidNames:["Raid"]});
  if(change==="restriction")definitions[legendary]!.allowedFactions=["Other"];
  if(change==="unknown restriction")delete definitions[legendary]!.allowedFactions;
  if(change==="rarity")units[1]!.rarity="Epic";
  if(change==="slot")definitions[epic]!.type="I_Block";
  if(change==="unknown item")delete definitions[legendary];
  if(change==="same item")units[1]!.items[0]!.id=legendary;
  if(change==="no role")active=roles();
  if(change==="unknown character")chars.pop();
  if(change==="stale name")targets[0]!.character="Different";
  if(change==="minimum level")targets[0]!.minimumLevel=3;
  if(change==="mythic")definitions[epic]!.rarity="Mythic";
  assert.equal(planLegendaryReallocation({units,targets,characters:chars,equipment:definitions,roles:active}).transfers.length,0,change);
 }
});

test("unreadable saved War selections protect every holder rather than assuming a free donor",()=>{
 const units=[unit("Donor"),unit("Raid",epic)];
 const result=planLegendaryReallocation({units,targets:[target("Raid")],characters:characters(units),equipment,roles:roles({raidNames:["Raid"]}),warUnknown:true});
 assert.equal(result.transfers.length,0);
 assert.match(result.protectedGear[0]!.reason,/War selections unavailable/);
});

test("Epic transfers support newer rosters without allowing rarity downgrades or gated equipment",()=>{
 const uncommon="I_Crit_U006";
 const definitions={...equipment,[uncommon]:{type:"I_Crit",rarity:"Uncommon",allowedFactions:["Allowed"]}};
 const units=[unit("Donor",epic,9),{...unit("Raid",uncommon),rarity:"Epic"}];
 const input={units,targets:[{...target("Raid"),itemId:epic,minimumLevel:7}],characters:characters(units),equipment:definitions,roles:roles({raidNames:["Raid"]})};
 assert.equal(planLegendaryReallocation(input).transfers[0]?.level,9);
 assert.equal(planLegendaryReallocation({...input,units:[units[0]!,{...units[1]!,rarity:"Rare"}]}).transfers.length,0);
 assert.equal(planLegendaryReallocation({...input,units:[units[0]!,unit("Raid",legendary)]}).transfers.length,0);
 assert.equal(planLegendaryReallocation({...input,targets:[{...input.targets[0]!,minimumLevel:10}]}).transfers.length,0);
});

test("a higher-rarity ready donor precedes lower-rarity alternatives for the same slot",()=>{
 const uncommon="I_Crit_U006";
 const definitions={...equipment,[uncommon]:{type:"I_Crit",rarity:"Uncommon",allowedFactions:["Allowed"]}};
 const units=[unit("Legendary donor"),unit("Epic donor",epic,9),unit("Raid",uncommon)];
 const result=planLegendaryReallocation({units,targets:[{...target("Raid"),itemId:epic},target("Raid")],characters:characters(units),equipment:definitions,roles:roles({raidNames:["Raid"]})});
 assert.equal(result.transfers.length,1);
 assert.equal(result.transfers[0]?.itemId,legendary);
});
