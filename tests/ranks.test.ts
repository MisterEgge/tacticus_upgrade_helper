import test from "node:test";
import assert from "node:assert/strict";
import { rankName } from "../src/domain/ranks";

test("rank names use the in-game progression labels", () =>
{
    assert.equal(rankName(0), "Stone I");
    assert.equal(rankName(11), "Silver III");
    assert.equal(rankName(15), "Diamond I");
    assert.equal(rankName(99), "Unknown rank (99)");
});
