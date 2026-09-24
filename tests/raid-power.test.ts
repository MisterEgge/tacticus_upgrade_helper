import assert from "node:assert/strict";
import test from "node:test";
import {latestRaidPowerByUnit}from "../src/domain/raidPower";

test("raid power uses only the account's latest observed raid entry",()=>
{
    const power=latestRaidPowerByUnit([
        {userId:"other",startedOn:"2026-09-20T00:00:00Z",heroDetails:[{unitId:"kharn",power:9999}]},
        {userId:"self",startedOn:"2026-09-20T00:00:00Z",heroDetails:[{unitId:"kharn",power:3000}]},
        {userId:"self",startedOn:"2026-09-21T00:00:00Z",heroDetails:[{unitId:"kharn",power:3200},{unitId:"eldryon",power:2500}]}
    ],"self");
    assert.deepEqual([...power],[['kharn',3200],['eldryon',2500]]);
    assert.deepEqual([...latestRaidPowerByUnit([],undefined)],[]);
});
