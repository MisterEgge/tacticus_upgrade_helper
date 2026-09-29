import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rateCharacter,utilityAtLeast,type UtilityInputs} from "../src/domain/characterUtility";

const input:UtilityInputs={name:"Example",communityScore:null,accountPriority:0,mainRaidCore:false,mainRaidFlex:false,raidCore:false,raidFlex:false,warOption:false,incompleteCampaign:false};
test("planning ratings distinguish a selected raid core, campaign need, War option and missing evidence",()=>{
    assert.equal(rateCharacter({...input,mainRaidCore:true}).tier,"Core");
    assert.equal(rateCharacter({...input,raidCore:true}).tier,"Strong");
    assert.equal(rateCharacter({...input,incompleteCampaign:true}).tier,"Useful");
    assert.equal(rateCharacter({...input,warOption:true}).tier,"Situational");
    assert.equal(rateCharacter(input).tier,"No tracked signal");
    assert.equal(utilityAtLeast("Situational","Useful"),false);
});

test("the rating rubric covers every synced catalog character without inventing a community score",()=>{
    const catalog=JSON.parse(readFileSync("data/character_catalog.json","utf8")) as {characters:Array<{name:string}>};
    const ratings=catalog.characters.map(character=>rateCharacter({...input,name:character.name}));
    assert.equal(ratings.length,catalog.characters.length);
    assert.equal(new Set(ratings.map(row=>row.name)).size,catalog.characters.length);
    assert.ok(ratings.every(row=>row.communityScore===null&&row.tier==="No tracked signal"));
});
