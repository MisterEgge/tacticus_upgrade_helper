import assert from "node:assert/strict";
import test from "node:test";
import { inventoryCleanout } from "../src/domain/inventoryCleanout";

test("lower rarity excess is scrap-safe after every proven recipient already exceeds it", () =>
{

    const rows = inventoryCleanout(
        [{ id: "I_Test_R001", name: "Rare Aeldari Test", level: 1, amount: 4 }],
        [
            { id: "a", name: "A", progressionIndex: 12, items: [{ slotId: "Slot1", id: "I_Test_E001", rarity: "Epic", level: 1 }] },
            { id: "b", name: "B", progressionIndex: 9, items: [{ slotId: "Slot1", id: "I_Test_E001", rarity: "Epic", level: 1 }] }
        ],
        [],\n        [{ id: "a", equipment: ["I_Test"] }, { id: "b", equipment: ["I_Test"] }]\n    );
    assert.equal(rows[0]!.status, "SCRAP SAFE");
    assert.equal(rows[0]!.scrap, 4);

});

test("future higher-rarity recipient reserves copies and only surplus is scrap", () =>
{

    const rows = inventoryCleanout(
        [{ id: "I_Test_L001", name: "Legendary Test", level: 1, amount: 3 }],
        [
            { id: "a", name: "A", progressionIndex: 12, items: [{ slotId: "Slot1", id: "I_Test_E001", rarity: "Epic", level: 1 }] },
            { id: "b", name: "B", progressionIndex: 12, items: [{ slotId: "Slot1", id: "I_Test_E001", rarity: "Epic", level: 1 }] }
        ],
        [],\n        [{ id: "a", equipment: ["I_Test"] }, { id: "b", equipment: ["I_Test"] }]\n    );
    assert.equal(rows[0]!.keep, 2);
    assert.equal(rows[0]!.scrap, 1);
    assert.equal(rows[0]!.status, "EXCESS");

});

test("unproven compatibility never becomes scrap-safe", () =>
{

    const [unknownFamily] = inventoryCleanout([{ id: "opaque", level: 1, amount: 8 }], [], [], []);
    const [unknownPool] = inventoryCleanout([{ id: "I_Test_R001", level: 1, amount: 8 }], [{ id: "a", name: "A", progressionIndex: 12, items: [] }], [], [{ id: "a", equipment: ["I_Test"] }]);
    const [incompleteCatalog] = inventoryCleanout([{ id: "I_Test_R001", level: 1, amount: 8 }], [{ id: "a", name: "A", progressionIndex: 12, items: [{ slotId: "Slot1", id: "I_Test_E001", level: 1 }] }], [], [{ id: "a", equipment: ["I_Test"] }, { id: "locked", equipment: ["I_Test"] }]);
    for (const row of [unknownFamily!, unknownPool!, incompleteCatalog!])
    {

        assert.equal(row.status, "UNKNOWN — DO NOT SCRAP");
        assert.equal(row.scrap, 0);

    }

});
