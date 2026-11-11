import test from "node:test";
import assert from "node:assert/strict";
import {defenseConfidence,selectEvidenceDefense,suggestGoldDefenseBuilds,type DefenseCoreEvidence} from "../src/domain/warDefenseEvidence";
import {parseDefenseHtml} from "../src/domain/warDefenseImport";
import {warBadgeTargets} from "../src/domain/warBadgeTargets";

const core=(prefix:string,wins=90,used=100):DefenseCoreEvidence=>({key:prefix,core:[prefix+"1",prefix+"2",prefix+"3"],used,wins,flex:[{id:prefix+"4",used:100,wins:95},{id:prefix+"5",used:100,wins:90},{id:prefix+"6",used:2,wins:2}]});
const roster=(cores:DefenseCoreEvidence[],rank=12)=>[...new Set(cores.flatMap(team=>[...team.core,...team.flex.map(unit=>unit.id)]))].map(id=>({id,name:id,rank}));
test("tiny perfect samples rank below repeated strong performance",()=>{
 assert.ok(defenseConfidence(95,100)>defenseConfidence(2,2));
 assert.equal(defenseConfidence(4,2),0);
 assert.equal(defenseConfidence(0,0),0);
 const team=core("A");
 const selected=selectEvidenceDefense([team],roster([team]))[0];
 assert.deepEqual(selected?.members.slice(3),["A4","A5"]);
 assert.deepEqual(selected?.flex.slice(0,2).map(unit=>unit.id),["A4","A5"]);
});

test("cores follow actual defense rate regardless of export order or Wilson ordering",()=>{
 const higher=core("A",96,100),larger=core("B",950,1000),tie=core("C",960,1000);
 const owned=roster([higher,larger,tie]);
 assert.ok(defenseConfidence(larger.wins,larger.used)>defenseConfidence(higher.wins,higher.used));
 assert.deepEqual(selectEvidenceDefense([larger,higher,tie],owned).map(team=>team.core),[tie.core,higher.core,larger.core]);
 assert.deepEqual(selectEvidenceDefense([tie,higher,larger],owned).map(team=>team.core),[tie.core,higher.core,larger.core]);
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
 a.flex[2]={id:"A6",used:100,wins:80};
 const owned=roster([a]).filter(unit=>unit.id!=="A4");
 const team=selectEvidenceDefense([a],owned)[0];
 assert.ok(team?.members.includes("A5"));
 assert.ok(team?.members.includes("A6"));
});
test("shared defense flex goes to its highest-win-rate core and tiny samples are excluded",()=>{
 const a:DefenseCoreEvidence={key:"a",core:["a1","a2","a3"],used:1000,wins:800,flex:[{id:"a4",used:100,wins:95},{id:"a5",used:100,wins:90},{id:"a6",used:200,wins:88},{id:"shared",used:100,wins:95},{id:"tiny",used:2,wins:2}]};
 const b:DefenseCoreEvidence={key:"b",core:["b1","b2","b3"],used:1000,wins:790,flex:[{id:"b4",used:100,wins:92},{id:"b5",used:100,wins:90},{id:"shared",used:500,wins:470}]};
 const teams=selectEvidenceDefense([a,b],roster([a,b]));
 assert.equal(teams.length,2);
 assert.ok(teams[0]!.flex.some(candidate=>candidate.id==="shared"));
 assert.ok(!teams[1]!.flex.some(candidate=>candidate.id==="shared"));
 assert.ok(!teams.some(team=>team.members.includes("tiny")));
 assert.equal(new Set(teams.flatMap(team=>team.members)).size,10);
 assert.equal(new Set(teams.flatMap(team=>team.flex.map(candidate=>candidate.id))).size,teams.flatMap(team=>team.flex).length);
});
test("overlapping flex pools preserve the maximum number of complete teams",()=>{
 const cores=["a","b","c"].map(prefix=>({key:prefix,core:[`${prefix}1`,`${prefix}2`,`${prefix}3`],used:100,wins:90,flex:[{id:"shared1",used:100,wins:95},{id:"shared2",used:100,wins:90}]}));
 const teams=selectEvidenceDefense(cores,roster(cores));
 assert.equal(teams.length,1);
 assert.equal(teams[0]?.members.length,5);
 assert.equal(new Set(teams.flatMap(team=>team.members)).size,5);
});
test("Gold build plans show owned source lineups and uniquely assign candidates",()=>{
 const a:DefenseCoreEvidence={key:"a",core:["a1","a2","a3"],used:1000,wins:900,flex:[{id:"a4",used:500,wins:450},{id:"a5",used:400,wins:360},{id:"shared",used:500,wins:450}]};
 const b:DefenseCoreEvidence={key:"b",core:["b1","b2","b3"],used:800,wins:680,flex:[{id:"b4",used:300,wins:270},{id:"b5",used:250,wins:220},{id:"shared",used:500,wins:480}]};
 const units=roster([a,b]).map(unit=>({...unit,rank:["a1","a2","a3","a4"].includes(unit.id)?12:8}));
 const suggestions=suggestGoldDefenseBuilds([a,b],units,new Set(),2);
 assert.equal(suggestions.teams.length,2);
 const members=suggestions.teams.flatMap(team=>team.members);
 assert.equal(new Set(members).size,10);
 assert.ok(suggestions.teams.every(team=>team.rankGap>0));
 assert.ok(suggestions.teams.every(team=>team.members.length===5&&team.flex.length===2));
 assert.ok(members.filter(id=>id==="shared").length<=1);
 assert.equal(suggestions.characters.some(candidate=>members.includes(candidate.id)),false);
});
test("Gold build targets exclude assigned characters and list owned source characters when no full team is possible",()=>{
 const a=core("A");
 a.flex[2]={id:"A6",used:100,wins:90};
 const targets=suggestGoldDefenseBuilds([a],roster([a]),new Set(["A1","A2","A3","A4"]),1);
 assert.equal(targets.teams.length,0);
 assert.deepEqual(targets.characters.map(candidate=>candidate.id),["A5","A6"]);
});

const html=`<form action="/wars/analyze/defenders"><input type="checkbox" name="battlefield[]" value="2" checked><input name="authenticity_token" value="PRIVATE_TOKEN"></form><p>debuffed attacks only</p><table><tbody><tr data-core-key="a|b|c"><td></td><td></td><td>100</td><td>95</td></tr><tr id="core-details-a|b|c"><td><div class="grid"><div><img alt="d">Used <span>100</span><!-- Wins <span>95</span> --></div><div><img alt="e">Used <span>50</span><!-- Wins <span>40</span> --></div></div></td></tr></tbody></table><script>throw new Error('must not run')</script>`;

test("browser-saved absolute form URLs import with the same filters and statistics",()=>{
 const timestamp="2026-10-23T00:00:00Z";
 const relative=parseDefenseHtml(html,timestamp);
 const absolute=parseDefenseHtml(html.replace('action="/wars/analyze/defenders"','action="https://tacticus.xyz/wars/analyze/defenders"'),timestamp);
 assert.deepEqual(absolute.cores,relative.cores);
 assert.deepEqual(absolute.scope,relative.scope);
 for(const action of ["https://example.com/wars/analyze/defenders","https://tacticus.xyz/wars/analyze/attackers"]){
  assert.throws(()=>parseDefenseHtml(html.replace('action="/wars/analyze/defenders"',`action="${action}"`)),/No defender/);
 }
});
test("HTML import reads hidden flex counts, records filters and drops scripts and tokens",()=>{
 const data=parseDefenseHtml(html,"2026-10-22T00:00:00Z");
 assert.deepEqual(data.scope.battlefields,["2"]);
 assert.deepEqual(data.cores[0]?.flex,[{id:"d",used:100,wins:95},{id:"e",used:50,wins:40}]);
 assert.ok(!JSON.stringify(data).includes("PRIVATE_TOKEN"));
 assert.throws(()=>parseDefenseHtml(html.replace('>95</span>','>101</span>')),/Invalid flex/);
 assert.throws(()=>parseDefenseHtml('<html>Challenge</html>'),/No defender/);
});
