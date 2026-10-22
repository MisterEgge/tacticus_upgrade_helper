import test from "node:test";
import assert from "node:assert/strict";
import {defenseConfidence,selectEvidenceDefense,type DefenseCoreEvidence} from "../src/domain/warDefenseEvidence";
import {parseDefenseHtml} from "../src/domain/warDefenseImport";
import {warBadgeTargets} from "../src/domain/warBadgeTargets";

const core=(prefix:string,wins=90,used=100):DefenseCoreEvidence=>({key:prefix,core:[prefix+"1",prefix+"2",prefix+"3"],used,wins,flex:[{id:prefix+"4",used:100,wins:95},{id:prefix+"5",used:100,wins:90},{id:prefix+"6",used:2,wins:2}]});
const roster=(cores:DefenseCoreEvidence[],rank=12)=>[...new Set(cores.flatMap(team=>[...team.core,...team.flex.map(unit=>unit.id)]))].map(id=>({id,name:id,rank}));
test("tiny perfect samples rank below repeated strong performance",()=>{
 assert.ok(defenseConfidence(95,100)>defenseConfidence(2,2));
 assert.equal(defenseConfidence(4,2),0);
 assert.equal(defenseConfidence(0,0),0);
 const team=core("A");
 assert.deepEqual(selectEvidenceDefense([team],roster([team]))[0]?.flex.map(unit=>unit.id),["A4","A5"]);
});
test("two Gold and three Silver teams use 25 unique owned characters",()=>{
 const cores=Array.from({length:5},(_,index)=>core(String(index),95-index));
 const result=selectEvidenceDefense(cores,roster(cores));
 assert.deepEqual(result.map(team=>team.tier),["gold","gold","silver","silver","silver"]);
 assert.equal(new Set(result.flatMap(team=>team.members)).size,25);
});
test("missing or previously assigned core members rule out the entire core",()=>{
 const a=core("A"),overlap={...core("B"),core:["A1","B2","B3"]},c=core("C");
 const owned=roster([a,overlap,c]).filter(unit=>unit.id!=="C1");
 assert.deepEqual(selectEvidenceDefense([a,overlap,c],owned).map(team=>team.core),[a.core]);
});
test("Silver ranks cannot fill Gold slots; owned Gold characters can fill Silver",()=>{
 const a=core("A"),b=core("B");
 const owned=roster([a,b]).map(unit=>({...unit,rank:unit.id.startsWith("A")?9:12}));
 const teams=selectEvidenceDefense([a,b],owned);
 assert.equal(teams[0]?.tier,"gold");assert.deepEqual(teams[0]?.core,b.core);
 assert.equal(teams[1]?.tier,"silver");assert.equal(teams[1]?.slot,2);
 const budgets=warBadgeTargets(teams.map(team=>({...team,members:team.members.map(name=>({name}))})),[],null,"war-defense");
 assert.equal(budgets.get("A1"),26);assert.equal(budgets.get("B1"),35);
});
test("unowned flex is skipped without borrowing another core character or repeating a pick",()=>{
 const a=core("A");
 const owned=roster([a]).filter(unit=>unit.id!=="A4");
 assert.deepEqual(selectEvidenceDefense([a],owned)[0]?.flex.map(unit=>unit.id),["A5","A6"]);
});

const html=`<form action="/wars/analyze/defenders"><input type="checkbox" name="battlefield[]" value="2" checked><input name="authenticity_token" value="PRIVATE_TOKEN"></form><p>debuffed attacks only</p><table><tbody><tr data-core-key="a|b|c"><td></td><td></td><td>100</td><td>95</td></tr><tr id="core-details-a|b|c"><td><div class="grid"><div><img alt="d">Used <span>100</span><!-- Wins <span>95</span> --></div><div><img alt="e">Used <span>50</span><!-- Wins <span>40</span> --></div></div></td></tr></tbody></table><script>throw new Error('must not run')</script>`;
test("HTML import reads hidden flex counts, records filters and drops scripts and tokens",()=>{
 const data=parseDefenseHtml(html,"2026-10-22T00:00:00Z");
 assert.deepEqual(data.scope.battlefields,["2"]);
 assert.deepEqual(data.cores[0]?.flex,[{id:"d",used:100,wins:95},{id:"e",used:50,wins:40}]);
 assert.ok(!JSON.stringify(data).includes("PRIVATE_TOKEN"));
 assert.throws(()=>parseDefenseHtml(html.replace('>95</span>','>101</span>')),/Invalid flex/);
 assert.throws(()=>parseDefenseHtml('<html>Challenge</html>'),/No defender/);
});
