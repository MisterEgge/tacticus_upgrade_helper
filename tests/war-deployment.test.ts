import {test} from "node:test";
import assert from "node:assert/strict";
import {deploymentKey,validDeployment,restoreDeployments,moveDeployment,suggestedDeployment} from "../src/domain/warDeployment";

test("deployment restores only exact permutations for the same membership",()=>{
 const ids=["a","b","c","d","e"],key=deploymentKey(ids);
 assert.equal(key,deploymentKey([...ids].reverse()));
 const order=[...ids].reverse();
 assert.deepEqual(restoreDeployments({[key]:order},[ids]),{[key]:order});
 for(const invalid of [["a","a","c","d","e"],["a","b"],["a","b","c","d","x"],null,"abc"]){
  assert.equal(validDeployment(invalid,ids),false);
  assert.deepEqual(restoreDeployments({[key]:invalid},[ids]),{});
 }
 assert.deepEqual(restoreDeployments({[key]:order},[["a","b","c","d","f"]]),{});
});
test("moves preserve membership, handle boundaries and leave inputs untouched",()=>{
 const ids=["a","b","c","d","e"];
 assert.deepEqual(moveDeployment(ids,"c",-1),["a","c","b","d","e"]);
 assert.deepEqual(moveDeployment(ids,"c",1),["a","b","d","c","e"]);
 assert.deepEqual(moveDeployment(ids,"a",-1),ids);
 assert.deepEqual(moveDeployment(ids,"missing",1),ids);
 assert.deepEqual(ids,["a","b","c","d","e"]);
});
test("Rotbone suggestion is explicit while unreviewed teams keep source order",()=>{
 const ids=["a","deathRotbone","b","c","d"];
 assert.deepEqual(suggestedDeployment(ids).ids,["a","b","c","deathRotbone","d"]);
 assert.ok(suggestedDeployment(ids).reason);
 assert.deepEqual(suggestedDeployment(["a","b"]),{ids:["a","b"],reason:null});
});
