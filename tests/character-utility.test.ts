import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rateCharacter,utilityAtLeast,type UtilityInputs} from "../src/domain/characterUtility";

const input:UtilityInputs={name:"Example",communityScore:null,accountPriority:0,mainRaidCore:false,mainRaidFlex:false,raidCore:false,raidFlex:false,warOption:false,incompleteCampaign:false};
test("planning ratings distinguish selected teams, LRE focus, campaign need and low roster priority",()=>{
    assert.equal(rateCharacter({...input,mainRaidCore:true}).tier,"Core");
    assert.equal(rateCharacter({...input,raidCore:true}).tier,"Strong");
    assert.equal(rateCharacter({...input,incompleteCampaign:true}).tier,"Useful");
    assert.equal(rateCharacter({...input,priorityModes:["LRE"]}).tier,"Useful");
    assert.match(rateCharacter({...input,priorityModes:["LRE"]}).signals.join(" · "),/LRE focus/);
    assert.equal(rateCharacter({...input,communityTeams:["Mech (Core)"]}).tier,"Situational");
    assert.equal(rateCharacter({...input,warOption:true}).tier,"Situational");
    assert.equal(rateCharacter(input).tier,"Low priority");
    assert.match(rateCharacter(input).signals.join(" · "),/leave at the current rank unless you enjoy using them or a current LRE track needs them/);
    assert.equal(utilityAtLeast("Situational","Useful"),false);
});

test("the rating rubric covers every synced catalog character without inventing a community score",()=>{
    const catalog=JSON.parse(readFileSync("data/character_catalog.json","utf8")) as {characters:Array<{name:string}>};
    const ratings=catalog.characters.map(character=>rateCharacter({...input,name:character.name}));
    assert.equal(ratings.length,catalog.characters.length);
    assert.equal(new Set(ratings.map(row=>row.name)).size,catalog.characters.length);
    assert.ok(ratings.every(row=>row.communityScore===null&&row.tier==="Low priority"));
});

 test("optional usefulness and selected helpers never claim a mandatory campaign requirement",()=>{
 for(const name of ["Calgar","Azrael"]){
  assert.ok(rateCharacter({...input,name,communityScore:4}).signals.every(signal=>!signal.includes("Required")));
  const helper=rateCharacter({...input,name,campaignHelper:true});
  assert.ok(helper.signals.includes("Selected campaign helper"));
  assert.ok(helper.signals.every(signal=>!signal.includes("Required")));
 }
 const unknown=rateCharacter({...input,campaignProgressUnknown:true});
 assert.ok(unknown.signals.includes("Required campaign character: completion unverified"));
 assert.ok(unknown.signals.every(signal=>!signal.includes("unfinished")));
 assert.ok(rateCharacter({...input,incompleteCampaign:true}).signals.includes("Required in unfinished campaign"));
 });
