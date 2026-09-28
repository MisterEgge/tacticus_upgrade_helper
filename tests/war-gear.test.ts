import test from "node:test";
import assert from "node:assert/strict";
import { warGearLabel, warGearStatus } from "../src/domain/warGear";

test("Epic 9 and Legendary 1 both satisfy the War gear baseline", () =>
{
    const status = warGearStatus([
        { slotId: "Slot1", rarity: "Epic", level: 9 },
        { slotId: "Slot2", rarity: "Legendary", level: 1 },
        { slotId: "Slot3", rarity: "Mythic", level: 1 }
    ]);
    assert.deepEqual(status, { ready: 3, total: 3, missing: [] });
});

test("under-refined Epic gear remains a War upgrade", () =>
{
    const label = warGearLabel([
        { slotId: "Slot1", rarity: "Epic", level: 9 },
        { slotId: "Slot2", rarity: "Epic", level: 8 },
        { slotId: "Slot3", rarity: "Legendary", level: 1 }
    ]);
    assert.equal(label.ready, false);
    assert.equal(label.summary, "2/3 War-ready");
    assert.match(label.detail, /Epic 8/);
});

test("Silver War slots accept Rare 7 or any higher-rarity item",()=>{
    const items=[
        {slotId:"Slot1",rarity:"Rare",level:7},
        {slotId:"Slot2",rarity:"Epic",level:1},
        {slotId:"Slot3",rarity:"Legendary",level:1}
    ];
    assert.equal(warGearStatus(items,"silver").ready,3);
    assert.equal(warGearStatus(items,"gold").ready,1);
    assert.match(warGearLabel(items,"silver").detail,/Rare 7 or higher rarity/);
    assert.deepEqual(warGearStatus([{slotId:"Slot1",rarity:"Rare",level:6}],"silver").missing[0],{slotId:"Slot1",rarity:"Rare",level:6});
});

test("missing item data is safely shown as three unresolved gear slots", () =>
{
    assert.deepEqual(warGearStatus(undefined), {
        ready: 0,
        total: 3,
        missing: [
            { slotId: "Slot1", rarity: "Unequipped", level: 0 },
            { slotId: "Slot2", rarity: "Unequipped", level: 0 },
            { slotId: "Slot3", rarity: "Unequipped", level: 0 }
        ]
    });
});
