import assert from "node:assert/strict";
import test from "node:test";
import {restoreWarMachines,warMachineAvailable} from "../src/domain/warMachineSelection";

test("saved War machine assignments reject duplicates, obsolete teams and unowned machines",()=>{
 assert.deepEqual(restoreWarMachines({first:"bio",second:"bio",third:"unowned",obsolete:"forge"},["first","second","third"],new Set(["bio","forge"])),{first:"bio"});
 assert.deepEqual(restoreWarMachines(["bio"],["first"],new Set(["bio"])),{});
});
test("a machine stays available to its owner, is blocked elsewhere, and becomes available when released",()=>{
 const saved={first:"bio",second:"forge"};
 assert.equal(warMachineAvailable(saved,"first","bio"),true);
 assert.equal(warMachineAvailable(saved,"third","bio"),false);
 assert.equal(warMachineAvailable(saved,"first",""),true);
 assert.equal(warMachineAvailable({...saved,first:""},"third","bio"),true);
 // Offense is a separate assignment map and can use the same owned machine.
 assert.equal(warMachineAvailable({},"offense first","bio"),true);
});
