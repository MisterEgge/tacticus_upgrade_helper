import assert from "node:assert/strict";
import test from "node:test";
import {campaignGearProtection} from "../src/domain/campaignGearProtection";
import {gearRoles,planLegendaryReallocation} from "../src/domain/legendaryReallocation";
import {gearRoleFocus} from "../src/domain/gearRoleFocus";
import reviewed from "../config/ability_breakpoints.json";

const characters=[{name:"Donor",campaignsRequiredIn:["Fall of Cadia"]}];
const battles=[{campaign:"Fall of Cadia",campaignType:"Standard",nodeNumber:75},{campaign:"Fall of Cadia",campaignType:"Elite",nodeNumber:40}];
const normal={name:"Fall of Cadia",type:"Standard",highestCompletedBattle:75};
const elite={name:"Fall of Cadia",type:"Elite",highestCompletedBattle:40};
test("Angrax retains his reviewed LRE and Onslaught uses after campaign completion",()=>{
 const focus=gearRoleFocus({},reviewed);
 assert.ok(focus.Angrax?.modes?.includes("LRE"));
 assert.ok(focus.Angrax?.modes?.includes("Onslaught"));
 const roles=gearRoles({raidNames:[],raidOptions:[],warNames:[],campaignNames:[],campaignUnknown:[],focus});
 assert.ok(roles.has("Angrax"));
});
test("completed normal campaign cannot release gear while Elite is unknown or unfinished",()=>{
 assert.deepEqual(campaignGearProtection(characters,[normal],battles).campaignUnknown,["Donor"]);
 assert.deepEqual(campaignGearProtection(characters,[normal,{...elite,highestCompletedBattle:39}],battles).campaignNames,["Donor"]);
 assert.deepEqual(campaignGearProtection(characters,[normal,elite],battles),{campaignNames:[],campaignUnknown:[]});
});
test("campaign completion permits a donor only without another protected use",()=>{
 const protection=campaignGearProtection(characters,[normal,elite],battles);
 const base={raidNames:["Laviscus"],raidOptions:[],warNames:[],focus:{},...protection};
 const units=[{id:"donor",name:"Donor",rarity:"Legendary",items:[{slotId:"Slot2",id:"shield",level:3}]},{id:"lav",name:"Laviscus",rarity:"Legendary",items:[{slotId:"Slot2",id:"old",level:1}]}];
 const input={units,targets:[{character:"Laviscus",characterId:"lav",slotId:"Slot2",itemId:"shield",minimumLevel:3,inventoryReady:false}],characters:units.map(unit=>({id:unit.id,name:unit.name,faction:"Allowed",equipment:["I_Block"]})),equipment:{shield:{type:"I_Block",rarity:"Legendary",allowedFactions:["Allowed"]},old:{type:"I_Block",rarity:"Epic",allowedFactions:["Allowed"]}}};
 assert.equal(planLegendaryReallocation({...input,roles:gearRoles(base)}).transfers.length,1);
 for(const other of [{warNames:["Donor"]},{raidOptions:["Donor"]},{focus:{Donor:{modes:["LRE","Onslaught"]}}}])assert.equal(planLegendaryReallocation({...input,roles:gearRoles({...base,...other})}).transfers.length,0);
});
