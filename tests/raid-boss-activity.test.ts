import assert from "node:assert/strict";
import test from "node:test";
import {activeRaidBoss,recentRaidBoss} from "../src/domain/raidBossActivity";

const now=Date.parse("2026-11-18T18:00:00Z");
const open={encounterType:"Boss",type:"HiveTyrantLeviathan",remainingHp:500,completedOn:"2026-11-18T17:40:00Z"};

test("recent guild activity identifies a surviving boss by encounter type or official unit ID",()=>{
 const older={...open,type:"",unitId:"GuildBoss1Boss1TyranTervigonLeviathan",completedOn:(now-45*60_000)/1000};
 assert.deepEqual(recentRaidBoss([open,older],now),{boss:"Hive Tyrant",battleAt:"2026-11-18T17:40:00.000Z"});
 assert.equal(recentRaidBoss([older],now)?.boss,"Tervigon");
});

test("empty, stale, killed, unknown and ambiguous logs leave the boss picker manual",()=>{
 assert.equal(recentRaidBoss([],now),null);
 for(const entry of [
  {...open,completedOn:"2026-11-16T10:00:00Z"},
  {...open,remainingHp:0},
  {...open,type:"Unrecognized"},
  {...open,encounterType:"SideBoss"},
 ])assert.equal(recentRaidBoss([entry],now),null);
 assert.equal(recentRaidBoss([open,{...open,remainingHp:0}],now),null);
 assert.equal(recentRaidBoss([open,{...open,remainingHp:0,completedOn:"2026-11-18T17:55:00Z"}],now),null);
 assert.equal(activeRaidBoss(recentRaidBoss([open],now),now+24*60*60_000),null);
});
