import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectedWarGearGoals,equipmentTeamGoal,equipmentOptionFitsGoal,preferredDefensiveItemId} from "../src/domain/equipmentGoals";

test("equipment follows five active defense slots, excludes reserves, and retains independent offense targets",()=>{
 const defense=Array.from({length:10},(_,i)=>({name:`Defense${i}`,used:100-i,members:[{name:`D${i}`}]}));
 const offense=[{name:"Attack",used:100,members:[{name:"D3"},{name:"O"}]}];
 const names=defense.map(team=>team.name);[names[0],names[9]]=[names[9]!,names[0]!];
 const goals=selectedWarGearGoals(defense,offense,{defense:names,offense:["Attack"],offenseTiers:["gold",...Array(9).fill("silver")]});
 assert.equal(goals.has("D0"),false);assert.equal(goals.has("D5"),false);
 assert.equal(goals.get("D9"),"gold");assert.equal(goals.get("D4"),"silver");
 assert.equal(goals.get("D3"),"gold");assert.equal(goals.get("O"),"gold");
});
test("War goal caps prevent unnecessary Legendary purchases while selected raid goals take precedence",()=>{
 const war=new Map<string,"gold"|"silver">([["Gold","gold"],["Silver","silver"]]);
 assert.equal(equipmentTeamGoal("Gold","Legendary",new Set(),war,"teams")?.rarity,"Epic");
 assert.equal(equipmentTeamGoal("Gold","Legendary",new Set(),war,"teams")?.level,9);
 assert.equal(equipmentTeamGoal("Silver","Legendary",new Set(),war,"teams")?.rarity,"Rare");
 assert.equal(equipmentTeamGoal("Silver","Legendary",new Set(["Silver"]),war,"teams")?.rarity,"Legendary");
 assert.equal(equipmentTeamGoal("Gold","Rare",new Set(),war,"teams")?.rarity,"Rare");
 assert.equal(equipmentTeamGoal("unused","Legendary",new Set(),war,"teams"),null);
});
test("preferred armor uses verified stats and faction compatibility rather than the item's name",()=>{
 const equipment=JSON.parse(readFileSync("data/game/shops.json","utf8")).equipment;
 const ork={id:"orksKillaKan",faction:"Orks"};
 assert.equal(preferredDefensiveItemId(ork,[],["I_Defensive"],"Epic","I_Defensive_E003",equipment),"I_Defensive_E007");
 assert.equal(preferredDefensiveItemId(ork,[],["I_Defensive"],"Epic","I_Defensive_E007",equipment),null);
 assert.equal(preferredDefensiveItemId({id:"bellator",faction:"Ultramarines"},["MkXGravis"],["I_Defensive"],"Epic","I_Defensive_E003",equipment),null);
 assert.equal(preferredDefensiveItemId({id:"unknown",faction:"unknown"},[],["I_Defensive"],"Epic","I_Defensive_E003",equipment),null);
 assert.equal(preferredDefensiveItemId(ork,[],["I_Defensive"],"Epic","I_Crit_E001",equipment),null);
});

test("Legendary Rho armor correction offers Epic and Legendary but never Rare",()=>{
 const equipment=JSON.parse(readFileSync("data/game/shops.json","utf8")).equipment;
 const unit={id:"admechRho",faction:"AdeptusMechanicus"};
 assert.equal(preferredDefensiveItemId(unit,[],["I_Defensive"],"Rare","I_Defensive_L003",equipment),null);
 const epic=preferredDefensiveItemId(unit,[],["I_Defensive"],"Epic","I_Defensive_L003",equipment);
 const legendary=preferredDefensiveItemId(unit,[],["I_Defensive"],"Legendary","I_Defensive_L003",equipment);
 assert.ok(epic);assert.ok(legendary);
 const goal={rarity:"Rare",priority:60};
 assert.equal(equipmentOptionFitsGoal("Legendary","Rare","Legendary",goal),false);
 assert.equal(equipmentOptionFitsGoal("Legendary","Epic","Legendary",goal),true);
 assert.equal(equipmentOptionFitsGoal("Legendary","Legendary","Legendary",goal),true);
 assert.equal(equipmentOptionFitsGoal("Rare","Epic","Legendary",{rarity:"Legendary",priority:100}),true);
});
