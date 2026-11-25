import assert from "node:assert/strict";
import test from "node:test";
import {campaignGearProtection} from "../src/domain/campaignGearProtection";
import {gearRoles,planLegendaryReallocation} from "../src/domain/legendaryReallocation";
import {gearRoleFocus} from "../src/domain/gearRoleFocus";
import reviewed from "../config/ability_breakpoints.json";
import catalog from "../data/character_catalog.json";
import {characterPlanningPriority,DEFAULT_PRIORITIES} from "../src/domain/playerPriorities";

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
test("campaign completion releases a donor, while a lower-priority role can supply a selected Raid upgrade",()=>{
 const protection=campaignGearProtection(characters,[normal,elite],battles);
 const base={raidNames:["Laviscus"],raidOptions:[],warNames:[],focus:{},...protection};
 const units=[{id:"donor",name:"Donor",rarity:"Legendary",items:[{slotId:"Slot2",id:"shield",level:3}]},{id:"lav",name:"Laviscus",rarity:"Legendary",items:[{slotId:"Slot2",id:"old",level:1}]}];
 const input={units,targets:[{character:"Laviscus",characterId:"lav",slotId:"Slot2",itemId:"shield",minimumLevel:3,inventoryReady:false}],characters:units.map(unit=>({id:unit.id,name:unit.name,faction:"Allowed",equipment:["I_Block"]})),equipment:{shield:{type:"I_Block",rarity:"Legendary",allowedFactions:["Allowed"]},old:{type:"I_Block",rarity:"Epic",allowedFactions:["Allowed"]}}};
 assert.equal(planLegendaryReallocation({...input,roles:gearRoles(base)}).transfers.length,1);
 for(const other of [{warNames:["Donor"]},{raidOptions:["Donor"]},{focus:{Donor:{modes:["LRE","Onslaught"]}}}])assert.equal(planLegendaryReallocation({...input,roles:gearRoles({...base,...other})}).transfers.length,1);
 assert.equal(planLegendaryReallocation({...input,roles:gearRoles({...base,campaignNames:["Donor"]})}).transfers.length,0);
 assert.equal(planLegendaryReallocation({...input,roles:gearRoles({...base,campaignUnknown:["Donor"]})}).transfers.length,0);
 assert.equal(planLegendaryReallocation({...input,roles:gearRoles({...base,raidNames:["Laviscus","Donor"]})}).transfers.length,0);
});

test("Jain Zar, Maugan Ra and other optional Aeldari helpers remain campaign members at Saim-Hann Elite 39",()=>{
 const aeldari=catalog.characters.filter(character=>character.faction==="Aeldari");
 assert.deepEqual(aeldari.find(character=>character.name==="Jain Zar")!.campaignsRequiredIn,[]);
 const nodes=[{campaign:"Saim-Hann",campaignType:"Standard",nodeNumber:75},{campaign:"Saim-Hann",campaignType:"Elite",nodeNumber:40}];
 const progress=[{name:"Saim-Hainn",type:"Standard",highestCompletedBattle:75},{name:"Saim-Hainn Elite",type:"Elite",highestCompletedBattle:39}];
 const result=campaignGearProtection(aeldari,progress,nodes);
 for(const name of aeldari.map(character=>character.name))assert.ok(result.campaignNames.includes(name),name);
 const jainScore=characterPlanningPriority(DEFAULT_PRIORITIES,"eldarJainZar",["campaign"]);
 const raidScore=characterPlanningPriority(DEFAULT_PRIORITIES,"raid",["raid"]);
 assert.ok(jainScore>raidScore);
 const units=[{id:"eldarJainZar",name:"Jain Zar",rarity:"Legendary",items:[{slotId:"Slot2",id:"shield",level:3}]},{id:"lav",name:"Laviscus",rarity:"Legendary",items:[{slotId:"Slot2",id:"old",level:1}]}];
 const input={units,targets:[{character:"Laviscus",characterId:"lav",slotId:"Slot2",itemId:"shield",minimumLevel:3,inventoryReady:false}],characters:units.map(unit=>({id:unit.id,name:unit.name,faction:"Allowed",equipment:["I_Block"]})),equipment:{shield:{type:"I_Block",rarity:"Legendary",allowedFactions:["Allowed"]},old:{type:"I_Block",rarity:"Epic",allowedFactions:["Allowed"]}}};
 for(const scores of [{"Jain Zar":jainScore,Laviscus:raidScore},{"Jain Zar":0,Laviscus:43000}]){
  const roles=gearRoles({raidNames:["Laviscus"],raidOptions:[],warNames:[],focus:{},...result,planningScores:scores});
  assert.equal(roles.get("Jain Zar")!.donationBlocked,true);
  assert.equal(planLegendaryReallocation({...input,roles}).transfers.length,0);
 }
 progress[1]!.highestCompletedBattle=40;
 const completed=campaignGearProtection(aeldari,progress,nodes);
 assert.deepEqual(completed,{campaignNames:[],campaignUnknown:[]});
 const roles=gearRoles({raidNames:["Laviscus"],raidOptions:[],warNames:[],focus:{},...completed});
 assert.equal(planLegendaryReallocation({...input,roles}).transfers[0]?.character,"Jain Zar");
});

test("optional campaign helpers stay protected when Elite progress is missing",()=>{
 const helper={name:"Maugan Ra",faction:"Aeldari",alliance:"Xenos",campaignsRequiredIn:[]};
 const nodes=[{campaign:"Saim-Hann",campaignType:"Standard",nodeNumber:75},{campaign:"Saim-Hann",campaignType:"Elite",nodeNumber:40}];
 assert.deepEqual(campaignGearProtection([helper],[{name:"Saim-Hann",type:"Standard",highestCompletedBattle:75}],nodes).campaignUnknown,["Maugan Ra"]);
 assert.deepEqual(campaignGearProtection([{...helper,faction:"Tau Empire"}],[],nodes),{campaignNames:[],campaignUnknown:[]});
});

test("broad allied helpers get donor protection without treating every Imperial as a new investment target",()=>{
 const helper={name:"Isabella",faction:"Adepta Sororitas",alliance:"Imperial",campaignsRequiredIn:[]};
 const nodes=[{campaign:"Indomitus",campaignType:"Standard",nodeNumber:75},{campaign:"Indomitus",campaignType:"Elite",nodeNumber:40}];
 const progress=[{name:"Indomitus",type:"Standard",highestCompletedBattle:75},{name:"Indomitus",type:"Elite",highestCompletedBattle:30}];
 assert.deepEqual(campaignGearProtection([helper],progress,nodes),{campaignNames:[],campaignUnknown:[]});
 const protection=campaignGearProtection([helper],progress,nodes,true);
 assert.ok(protection.campaignNames.includes("Isabella"));
 assert.equal(gearRoles({raidNames:[],raidOptions:[],warNames:[],focus:{},...protection}).get("Isabella")!.donationBlocked,true);
});
