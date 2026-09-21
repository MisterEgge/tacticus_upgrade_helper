import assert from "node:assert/strict";
import test from "node:test";
import { allocateEquipment, type EquipmentUnit } from "../src/domain/equipment";

const unit = (name = "Carry", id = "weapon_E001"): EquipmentUnit => ({ id: name, name, progressionIndex: 12, items: [{ slotId: "Slot1", id, rarity: "Epic", level: 1 }] });
const empty = { characters: {} };

test("preference is not compatibility: cross-family item never becomes EQUIP NOW", () =>
{

    const result = allocateEquipment([unit()], [{ id: "invalid_L999", amount: 1 }], {}, empty, { characters: { Carry: { Slot1: ["invalid_L999"] } } });
    assert.equal(result.equipNow.length, 0);
    assert.deepEqual(result.buyWatch[0]!.preferredLegendaryItemIds, ["weapon_L001"]);

});

test("unknown family plus preference remains compatibility UNKNOWN", () =>
{

    const result = allocateEquipment([unit("Carry", "unknown")], [{ id: "invalid_L999", amount: 1 }], {}, empty, { characters: { Carry: { Slot1: ["invalid_L999"] } } });
    assert.equal(result.equipNow.length, 0);
    assert.equal(result.compatibilityUnknown.length, 1);

});

test("a preferred known-compatible item is selected before same-family fallback", () =>
{

    const overrides = { characters: { Carry: { Slot1: ["other_L002"] } } };
    const result = allocateEquipment([unit()], [{ id: "weapon_L001", amount: 1 }, { id: "other_L002", amount: 1 }], {}, overrides, overrides);
    assert.equal(result.equipNow[0]!.recommendedItemId, "other_L002");

});

test("same-family Legendary fallback is available when preferred inventory is absent", () =>
{

    const overrides = { characters: { Carry: { Slot1: ["other_L002"] } } };
    const result = allocateEquipment([unit()], [{ id: "weapon_L001", amount: 1 }], {}, overrides, overrides);
    assert.equal(result.equipNow[0]!.recommendedItemId, "weapon_L001");

});

test("scarce inventory is consumed once and assigned to highest account priority", () =>
{

    const result = allocateEquipment([unit("Low"), unit("High")], [{ id: "weapon_L001", amount: 1 }], { Low: { priority: 1 }, High: { priority: 100 } }, empty, empty);
    assert.equal(result.equipNow.length, 1);
    assert.equal(result.equipNow[0]!.character, "High");
    assert.equal(result.buyWatch[0]!.character, "Low");

});

test("separate inventory stacks aggregate without creating extra items", () =>
{

    const result = allocateEquipment([unit("A"), unit("B"), unit("C")], [{ id: "weapon_L001", amount: 1 }, { id: "weapon_L001", amount: 1 }], {}, empty, empty);
    assert.equal(result.equipNow.length, 2);
    assert.equal(result.buyWatch.length, 1);

});

test("already Legendary/Mythic equipment is never downgraded", () =>
{

    const u = unit();
    u.items[0]!.rarity = "Mythic";
    assert.equal(allocateEquipment([u], [{ id: "weapon_L001", amount: 1 }], {}, empty, empty).equipNow.length, 0);

});
