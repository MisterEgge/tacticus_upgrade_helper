import assert from "node:assert/strict";
import test from "node:test";
import { offerEligibility, recordState, refreshesLoggedToday, scheduleLabel, scheduledOn, sourceMatch, validateRecord, type ShopCatalog, type ShopOffer, type ShopRecord } from "../src/domain/shops";

const offer = (itemId = "I_Test_L001"): ShopOffer => ({ id: "guild:1:1", slot: 1, itemId, quantity: 1, schedule: "0 0 0 ? * MON,WED *", cost: { currency: "guildCredits", amount: 100 }, maxPurchases: 1, conditions: {}, weight: null });
const catalog: ShopCatalog = { schemaVersion: 1, reviewedAt: "2026-09-22T00:00:00.000Z", sourceCommit: "a".repeat(40), sourceKind: "community", equipment: { I_Test_L001: { name: "Test item", rarity: "Legendary", type: "I_Test" } }, shops: [{ id: "guild", name: "Guild Shop", coverage: "catalog", sourceUrl: "", notes: "", adRefresh: true, refreshLimit: 1, refreshCost: null, offers: [offer(), offer("itemsLegendary_I_Test")] }] };

test("shop rotations distinguish scheduled offers from unknown schedules", () =>
{
    assert.equal(scheduledOn(offer().schedule, "MON"), true);
    assert.equal(scheduledOn(offer().schedule, "TUE"), false);
    assert.equal(scheduledOn("not a schedule", "MON"), null);
    assert.equal(scheduleLabel(offer().schedule), "MON / WED (UTC)");
});

test("shop sources distinguish exact items from random compatible pools", () =>
{
    assert.equal(sourceMatch("I_Test_L001", offer(), catalog.equipment), "exact");
    assert.equal(sourceMatch("I_Test_L001", offer("itemsLegendary_I_Test"), catalog.equipment), "pool");
    assert.equal(sourceMatch("I_Other_L001", offer("itemsLegendary_I_Test"), catalog.equipment), null);
});

test("shop eligibility never assumes unrecognized locks are open", () =>
{
    assert.equal(offerEligibility({ ...offer(), conditions: { minPowerLevel: 20 } }, 10), "locked");
    assert.equal(offerEligibility({ ...offer(), conditions: { minPowerLevel: 20 } }, null), "unknown");
    assert.equal(offerEligibility({ ...offer(), conditions: { lockId: "event" } }, 100), "unknown");
});

test("manual shop records require valid future observations and expire safely", () =>
{
    const now = Date.UTC(2026, 8, 22, 12);
    const record: ShopRecord = { id: "seen", shopId: "guild", recordedAt: now, kind: "stock", itemId: "I_Test_L001", quantity: 1, cost: 100, currency: "guildCredits", expiresAt: now + 3600000, status: "available", method: "ad" };
    assert.equal(validateRecord(record, catalog), true);
    assert.equal(recordState(record, [record], now), "Seen available (manual)");
    assert.equal(recordState(record, [record], now + 3600000), "Expired — recheck shop");
    assert.equal(validateRecord({ ...record, expiresAt: now }, catalog), false);
    assert.equal(refreshesLoggedToday([{ ...record, id: "refresh", kind: "refresh", itemId: "", quantity: 0, expiresAt: now + 3600000 }], "guild", now), 1);
});
