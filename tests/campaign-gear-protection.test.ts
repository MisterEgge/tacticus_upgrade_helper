import {campaignKey} from "../src/domain/campaigns";
import assert from "node:assert/strict";
import test from "node:test";
import {campaignGearProtection,campaignHelperProtection} from "../src/domain/campaignGearProtection";
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

test("only explicitly planned Jain Zar is protected as a helper at Saim-Hann Elite 39",()=>{
 const aeldari=catalog.characters.filter(character=>character.faction==="Aeldari");
 assert.deepEqual(aeldari.find(character=>character.name==="Jain Zar")!.campaignsRequiredIn,[]);
 const nodes=[{campaign:"Saim-Hann",campaignType:"Standard",nodeNumber:75},{campaign:"Saim-Hann",campaignType:"Elite",nodeNumber:40}];
 const progress=[{name:"Saim-Hainn",type:"Standard",highestCompletedBattle:75},{name:"Saim-Hainn Elite",type:"Elite",highestCompletedBattle:39}];
 const required=campaignGearProtection(aeldari,progress,nodes);
 assert.equal(required.campaignNames.includes("Jain Zar"),false);
 assert.equal(required.campaignNames.includes("Maugan Ra"),false);
 const result=campaignHelperProtection(aeldari,progress,nodes,{"Jain Zar":{campaignHelpersFor:["Saim-Hann"]}});
 assert.deepEqual(result.campaignNames,["Jain Zar"]);
 const jainScore=characterPlanningPriority(DEFAULT_PRIORITIES,"eldarJainZar",["campaign"]);
 const raidScore=characterPlanningPriority(DEFAULT_PRIORITIES,"raid",["raid"]);
 assert.ok(jainScore>raidScore);
 const units=[{id:"eldarJainZar",name:"Jain Zar",rarity:"Legendary",items:[{slotId:"Slot2",id:"shield",level:3}]},{id:"lav",name:"Laviscus",rarity:"Legendary",items:[{slotId:"Slot2",id:"old",level:1}]}];
 const input={units,targets:[{character:"Laviscus",characterId:"lav",slotId:"Slot2",itemId:"shield",minimumLevel:3,inventoryReady:false}],characters:units.map(unit=>({id:unit.id,name:unit.name,faction:"Allowed",equipment:["I_Block"]})),equipment:{shield:{type:"I_Block",rarity:"Legendary",allowedFactions:["Allowed"]},old:{type:"I_Block",rarity:"Epic",allowedFactions:["Allowed"]}}};
 for(const scores of [{"Jain Zar":jainScore,Laviscus:raidScore},{"Jain Zar":0,Laviscus:43000}]){
  const roles=gearRoles({raidNames:["Laviscus"],raidOptions:[],warNames:[],focus:{},campaignNames:[],campaignUnknown:[],campaignHelpers:result.campaignNames,planningScores:scores});
  assert.equal(roles.get("Jain Zar")!.donationBlocked,true);
  assert.equal(roles.get("Jain Zar")!.label,"Selected campaign helper");
  assert.equal(planLegendaryReallocation({...input,roles}).transfers.length,0);
 }
 progress[1]!.highestCompletedBattle=40;
 const completed=campaignHelperProtection(aeldari,progress,nodes,{"Jain Zar":{campaignHelpersFor:["Saim-Hann"]}});
 assert.deepEqual(completed,{campaignNames:[],campaignUnknown:[]});
 const roles=gearRoles({raidNames:["Laviscus"],raidOptions:[],warNames:[],focus:{},...completed});
 assert.equal(planLegendaryReallocation({...input,roles}).transfers[0]?.character,"Jain Zar");
});

test("optional campaign helpers stay protected when Elite progress is missing",()=>{
 const helper={name:"Maugan Ra",faction:"Aeldari",alliance:"Xenos",campaignsRequiredIn:[]};
 const nodes=[{campaign:"Saim-Hann",campaignType:"Standard",nodeNumber:75},{campaign:"Saim-Hann",campaignType:"Elite",nodeNumber:40}];
 assert.deepEqual(campaignHelperProtection([helper],[{name:"Saim-Hann",type:"Standard",highestCompletedBattle:75}],nodes,{"Maugan Ra":{campaignHelpersFor:["Saim-Hann"]}}).campaignUnknown,["Maugan Ra"]);
 assert.deepEqual(campaignGearProtection([{...helper,faction:"Tau Empire"}],[],nodes),{campaignNames:[],campaignUnknown:[]});
});

test("allied eligibility alone does not grant campaign protection; an explicit helper plan does",()=>{
 const helper={name:"Isabella",faction:"Adepta Sororitas",alliance:"Imperial",campaignsRequiredIn:[]};
 const nodes=[{campaign:"Indomitus",campaignType:"Standard",nodeNumber:75},{campaign:"Indomitus",campaignType:"Elite",nodeNumber:40}];
 const progress=[{name:"Indomitus",type:"Standard",highestCompletedBattle:75},{name:"Indomitus",type:"Elite",highestCompletedBattle:30}];
 assert.deepEqual(campaignGearProtection([helper],progress,nodes),{campaignNames:[],campaignUnknown:[]});
 const protection=campaignHelperProtection([helper],progress,nodes,{Isabella:{campaignHelpersFor:["Indomitus"]}});
 assert.ok(protection.campaignNames.includes("Isabella"));
 assert.equal(gearRoles({raidNames:[],raidOptions:[],warNames:[],focus:{},campaignNames:[],campaignUnknown:[],campaignHelpers:protection.campaignNames}).get("Isabella")!.donationBlocked,true);
});

 test("Calgar and Azrael never become required from faction, alliance or usefulness",()=>{
 const characters=catalog.characters.filter(unit=>["Calgar","Azrael","Bellator"].includes(unit.name));
 const nodes=[{campaign:"Indomitus",campaignType:"Standard",nodeNumber:75},{campaign:"Indomitus",campaignType:"Elite",nodeNumber:40}];
 const progress=[{name:"Indomitus",type:"Standard",highestCompletedBattle:30}];
 const required=campaignGearProtection(characters,progress,nodes);
 assert.deepEqual(required.campaignNames,["Bellator"]);
 assert.deepEqual(required.campaignUnknown,["Bellator"]);
 assert.deepEqual(campaignHelperProtection(characters,progress,nodes,{Calgar:{modes:["Campaign"]},Azrael:{modes:["Campaign"]}}),{campaignNames:[],campaignUnknown:[]});
 const roles=gearRoles({raidNames:[],raidOptions:[],warNames:[],focus:{},...required});
 assert.equal(roles.has("Calgar"),false);assert.equal(roles.has("Azrael"),false);
 const selected=campaignHelperProtection(characters,progress,nodes,{Calgar:{campaignHelpersFor:["Indomitus"]}});
 const selectedRoles=gearRoles({raidNames:[],raidOptions:[],warNames:[],focus:{},...required,campaignHelpers:selected.campaignNames});
 assert.equal(selectedRoles.get("Calgar")!.label,"Selected campaign helper");
 assert.equal(selectedRoles.get("Calgar")!.donationBlocked,true);
 });

test("missing or invalid completion values stay unknown rather than claiming unfinished",()=>{
 for(const highestCompletedBattle of [undefined,null,NaN,-1]){
  assert.deepEqual(campaignGearProtection(characters,[normal,{name:elite.name,type:elite.type,...(highestCompletedBattle===undefined?{}:{highestCompletedBattle})}],battles),{campaignNames:[],campaignUnknown:["Donor"]});
 }
});

test("every catalog character obeys declared campaign requirements across full and different account rosters",()=>{
 const family=(name:string)=>campaignKey(name,"Standard").replace(/ Elite$/,"");
 const families=[...new Set(catalog.characters.flatMap(unit=>unit.campaignsRequiredIn.map(family)))];
 const nodes=families.flatMap(campaign=>[{campaign,campaignType:"Standard",nodeNumber:75},{campaign,campaignType:"Elite",nodeNumber:40}]);
 const complete=families.flatMap(name=>[{name,type:"Standard",highestCompletedBattle:75},{name,type:"Elite",highestCompletedBattle:40}]);
 assert.equal(catalog.characters.length,catalog.sourceCharacterCount);
 const future={name:"Future optional helper",faction:"Ultramarines",alliance:"Imperial",campaignsRequiredIn:[]};
 for(const active of families){
  const progress=complete.map(row=>row.name===active?{...row,highestCompletedBattle:1}:row);
  const expected=catalog.characters.filter(unit=>unit.campaignsRequiredIn.some(name=>family(name)===active)).map(unit=>unit.name);
  for(const roster of [[...catalog.characters,future],[...catalog.characters].reverse()]){
   const result=campaignGearProtection(roster,progress,nodes);
   assert.deepEqual(new Set(result.campaignNames),new Set(expected),active);
   assert.deepEqual(result.campaignUnknown,[]);
   assert.deepEqual(campaignHelperProtection(roster,progress,nodes,Object.fromEntries(roster.map(unit=>[unit.name,{modes:["Campaign"]}]))),{campaignNames:[],campaignUnknown:[]});
  }
  for(const character of [...catalog.characters,future]){
   const result=campaignGearProtection([character],progress,nodes);
   assert.deepEqual(result.campaignNames,expected.includes(character.name)?[character.name]:[],active+": "+character.name);
  }
 }
 const declared=catalog.characters.filter(unit=>unit.campaignsRequiredIn.length>0).map(unit=>unit.name);
 assert.deepEqual(campaignGearProtection([...catalog.characters,future],complete,nodes),{campaignNames:[],campaignUnknown:[]});
 assert.deepEqual(new Set(campaignGearProtection([...catalog.characters,future],[],nodes).campaignUnknown),new Set(declared));
});
