import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { JSDOM } from "jsdom";
import GapTable from "../app/elite-farming-gaps/GapTable";
import CampaignUnlocks from "../app/elite-farming-gaps/CampaignUnlocks";
import type { EliteGap, EliteOpportunity } from "../src/domain/eliteFarmingGaps";
import type { FarmNode } from "../src/domain/farmingSources";

test("Elite gap interactions work with synthetic account data", async suite => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
    const descriptors = new Map<string, PropertyDescriptor | undefined>();
    for (const key of ["window", "self", "document", "navigator", "HTMLElement", "Node", "Event", "MutationObserver"]) {
        descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
        Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key as keyof typeof dom.window] });
    }
    const { render, fireEvent, cleanup } = await import("@testing-library/react");
    suite.after(() => {
        cleanup();
        dom.window.close();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    });
    const node: FarmNode = { id: "TE2", materialId: "ore", campaign: "Test Elite", campaignType: "Elite", nodeNumber: 2,
        energyCost: 10, rate: 1, unlocked: false, access: "locked" };
    const ore: EliteGap = { id: "ore", name: "Ore", rarity: "Rare", coverage: "locked", eliteNodes: [node], alternative: null,
        inventory: 1, remaining: 11, shortage: 10, status: "farming",
        characters: [{ id: "alpha", name: "Alpha", owned: true, lifetime: 20, remaining: 11, direct: 1, crafting: 10 }] };
    const rows: EliteGap[] = [ore, { ...ore, id: "dust", name: "Dust", coverage: "no-elite", eliteNodes: [], characters: [] },
        { ...ore, id: "chip", name: "Chip", coverage: "unknown", eliteNodes: [{ ...node, access: "unknown" }], shortage: null, characters: [] }];

    await suite.test("search includes recipient names and source filters change the visible rows", () => {
        const view = render(createElement(GapTable, { rows }));
        fireEvent.change(view.getByPlaceholderText("Search material, recipient, campaign or node…"), { target: { value: "Alpha" } });
        assert.equal(view.getAllByRole("row").length, 2);
        assert.ok(view.getByRole("link", { name: "Ore" }));
        fireEvent.change(view.getByPlaceholderText("Search material, recipient, campaign or node…"), { target: { value: "" } });
        fireEvent.click(view.getByRole("button", { name: /^No Elite source/ }));
        assert.ok(view.getByRole("link", { name: "Dust" }));
        assert.equal(view.queryByRole("link", { name: "Ore" }), null);
        fireEvent.click(view.getByRole("button", { name: /^Progress unknown/ }));
        assert.ok(view.getByRole("link", { name: "Chip" }));
        assert.equal(view.getAllByRole("row").length, 2);
        cleanup();
    });

    await suite.test("recipient details reveal direct and nested crafting counts", () => {
        const view = render(createElement(GapTable, { rows: [ore] }));
        const details = view.getByText("1 characters").closest("details")!;
        assert.equal(view.queryByRole("link", { name: "Alpha" }), null);
        details.open = true;
        fireEvent(details, new dom.window.Event("toggle"));
        assert.ok(view.getByRole("link", { name: "Alpha" }));
        assert.match(view.getByText(/1 direct \+ 10 through crafting/).textContent!, /11 remaining/);
        details.open = false;
        fireEvent(details, new dom.window.Event("toggle"));
        assert.equal(view.queryByRole("link", { name: "Alpha" }), null);
        cleanup();
    });

    await suite.test("campaign sections expand independently with controlled bodies", () => {
        const first: EliteOpportunity = { campaign: "Test Elite", frontier: 1, nextNode: 2, targetNode: 2,
            estimatedSavings: 20, comparedMaterials: 1, materials: [{ id: "ore", name: "Ore", shortage: 10, node, estimatedSavings: 20 }] };
        const second = { ...first, campaign: "Other Elite" };
        const view = render(createElement(CampaignUnlocks, { opportunities: [first, second] }));
        const a = view.getByRole("button", { name: /^Test Elite/ });
        const b = view.getByRole("button", { name: /^Other Elite/ });
        assert.equal(a.getAttribute("aria-expanded"), "false");
        fireEvent.click(a);
        assert.equal(a.getAttribute("aria-expanded"), "true");
        assert.equal(b.getAttribute("aria-expanded"), "false");
        assert.ok(dom.window.document.getElementById(a.getAttribute("aria-controls")!));
        fireEvent.click(b);
        fireEvent.click(a);
        assert.equal(a.getAttribute("aria-expanded"), "false");
        assert.equal(b.getAttribute("aria-expanded"), "true");
        assert.equal(view.getAllByRole("table").length, 1);
        cleanup();
    });
});
