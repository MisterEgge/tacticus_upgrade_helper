import assert from "node:assert/strict";
import test from "node:test";
import { suggestedRaidFlex } from "../src/domain/raidLineup";

const team={core:["Kariyan","Laviscus","Trajann"],flex:["Aesoth","Gulgortz","Kharn"],members:["Kariyan","Laviscus","Trajann","Aesoth","Gulgortz","Kharn"].map(name=>({name,owned:true}))};

test("owned Laviscus planning lineup uses Aesoth and Boss over Kharn by default",()=>{
    assert.deepEqual(suggestedRaidFlex("Avatar of Khaine","Big Hit",team),["Aesoth","Gulgortz"]);
});

test("a missing core or flex is never assigned as an owned default",()=>{
    assert.deepEqual(suggestedRaidFlex("Avatar of Khaine","Big Hit",{...team,members:team.members.filter(member=>member.name!=="Laviscus")}),[]);
    assert.deepEqual(suggestedRaidFlex("Avatar of Khaine","Big Hit",{...team,members:team.members.filter(member=>member.name!=="Gulgortz")}),["Aesoth"]);
    assert.deepEqual(suggestedRaidFlex("Belisarius Cawl","Big Hit",team),[]);
});
