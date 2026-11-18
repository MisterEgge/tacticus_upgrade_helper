import assert from "node:assert/strict";
import test from "node:test";
import {buildWarRosterLineups} from "../src/domain/warRosterLineups";

const unit=(id:string,rank=9,traits:string[]=[])=>({id,name:id,rank,traits,faction:"",grandAlliance:"Xenos"});

test("fills missing slots with distinct owned characters and favors documented pairings",()=>{
 const assigned=Array.from({length:40},(_,index)=>unit(`assigned-${index}`,15));
 const mechanic=unit("Mechanic",9,["Mechanic"]);
 const mechanical=unit("Mechanical",9,["Mechanical"]);
 const observed=["A","B","C"].map(id=>unit(id));
 const fillers=["D","E","F","G","H"].map(id=>unit(id));
 const roster=[...assigned,mechanic,mechanical,...observed,...fillers];
 const target=buildWarRosterLineups(roster,new Set(assigned.map(unit=>unit.id)),["silver","silver","silver"],[
  {ids:["A","B","C"],used:200},
 ]);
 assert.equal(target.length,2);
 assert.equal(new Set(target.flatMap(team=>team.members)).size,10);
 assert.ok(target.some(team=>team.reasons.includes("Mechanic can repair Mechanical.")));
 assert.ok(target.some(team=>team.reasons.some(reason=>reason.includes("200 recorded battles"))));
 assert.ok(target.every(team=>team.members.every(name=>!name.startsWith("assigned-"))));
});

test("prefers a full rank-ready lineup and still fills a slot if only lower-ranked units remain",()=>{
 const ready=Array.from({length:5},(_,index)=>unit(`Gold-${index}`,12));
 const under=Array.from({length:5},(_,index)=>unit(`Silver-${index}`,9));
 const teams=buildWarRosterLineups([...under,...ready],new Set(),["gold","gold"],[
  {ids:under.map(unit=>unit.id),used:2000},
 ]);
 assert.ok(teams[0]?.members.every(name=>name.startsWith("Gold")));
 assert.ok(teams[1]?.members.every(name=>name.startsWith("Silver")));
});
