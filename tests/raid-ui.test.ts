import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { JSDOM } from "jsdom";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import GuildRaidPlanner from "../app/guild-raid/GuildRaidPlanner";
import meta from "../config/raid_boss_meta.json";
import { defaultRaidSelection, type RaidTeams } from "../src/domain/raidSelection";
import type { RosterUnit } from "../app/lib/report";

test("boss selection, manual overrides, roadmap links and saving use the same owned lineup", async suite => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
    const descriptors = new Map<string, PropertyDescriptor | undefined>();
    for (const key of ["window", "self", "document", "navigator", "HTMLElement", "Node", "Event", "MutationObserver"]) {
        descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
        Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key as keyof typeof dom.window] });
    }
    const { render, fireEvent, cleanup, within, waitFor, act } = await import("@testing-library/react");
    const oldFetch = globalThis.fetch;
    suite.after(async () => {
        // Unmount work must settle while its browser globals still exist.
        await act(async () => { cleanup(); });
        globalThis.fetch = oldFetch;
        dom.window.close();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    });
    const bosses = meta.bosses as RaidTeams;
    const names = new Set(Object.values(bosses).flatMap(teams => Object.values(teams).flatMap(team => [...team.core, ...team.flex])));
    const owned = new Set(["Kariyan", "Laviscus", "Trajann", "Gulgortz", "Aesoth", "Atlacoya", "Helbrecht", "Vitruvius", "Kharn", "Dante", "Ragnar"]);
    const roster: RosterUnit[] = [...owned].map(name => ({ id: `synthetic-${name}`, name, rank: ["Kariyan", "Laviscus", "Trajann"].includes(name) ? 12 : 0,
        faction: "Synthetic", grandAlliance: "Imperial", rarity: "Legendary", xpLevel: 36, progressionIndex: 0, shards: 0, mythicShards: 0,
        abilities: [{ id: "active", level: ["Kariyan", "Laviscus", "Trajann"].includes(name) ? 36 : 1 }, { id: "passive", level: 36 }], items: [] }));
    const byName = new Map(roster.map(unit => [unit.name, unit]));
    const member = (name: string) => ({ name, id: `synthetic-${name}`, owned: owned.has(name), rank: byName.get(name)?.rank ?? null,
        rarity: "Legendary", xpLevel: 36, activeLevel: byName.get(name)?.abilities[0]?.level ?? null, passiveLevel: 36,
        activeTarget: "35", passiveTarget: "26", activeBasis: "Editorial planning target", passiveBasis: "Editorial planning target" });
    const teams = Object.fromEntries(Object.entries(bosses).map(([boss, teams]) => [boss,
        Object.fromEntries(Object.entries(teams).map(([name, team]) => [name, { ...team, members: [...team.core, ...team.flex].map(member) }]))]));
    assert.ok(names.has("Atlacoya"));
    let refreshed = 0;
    const router: AppRouterInstance = { bfcacheId: "synthetic", back() {}, forward() {}, push() {}, replace() {}, prefetch() {}, refresh() { refreshed++; } };
    const view = render(createElement(AppRouterContext.Provider, { value: router }, createElement(GuildRaidPlanner,
        { teams, source: meta._meta, roster, mainSelection: defaultRaidSelection(bosses, owned) })));
    const upgradeTable = () => within(view.getByRole("table"));
    const now = () => within(view.container.querySelector(".roadmapNow") as HTMLElement);

    fireEvent.change(view.getByLabelText("Raid boss"), { target: { value: "Tervigon" } });
    assert.equal((view.getByLabelText("Flex slot 1") as HTMLSelectElement).value, "Atlacoya");
    assert.equal(view.queryByLabelText("Flex slot 2"), null);
    assert.equal(upgradeTable().getAllByRole("row").length, 6);
    assert.ok(upgradeTable().getByRole("link", { name: /^Atlacoya(?: Atlacoya)?$/ }));
    assert.equal(upgradeTable().queryByRole("link", { name: /^Aesoth(?: Aesoth)?$/ }), null);
    assert.match(now().getByText("Atlacoya").parentElement!.textContent!, /Active 1 → 35/);
    assert.ok(now().getAllByRole("link", { name: "Plan rank materials →" }).some(link => link.getAttribute("href") === "/farming?character=synthetic-Atlacoya&target=12"));

    fireEvent.change(view.getByLabelText("Flex slot 1"), { target: { value: "Helbrecht" } });
    assert.ok(view.getByText("MANUAL FLEX"));
    assert.equal(now().queryByText("Atlacoya"), null);
    assert.ok(now().getByText("Helbrecht"));
    let saved: unknown;
    globalThis.fetch = async (_input, init) => { saved = JSON.parse(String(init?.body)); return new Response('{"ok":true}', { status: 200 }); };
    fireEvent.click(view.getByRole("button", { name: "Set as main Raid team" }));
    await waitFor(() => assert.equal((view.getByRole("button", { name: "Main team saved" }) as HTMLButtonElement).disabled, true));
    assert.deepEqual(saved, { boss: "Tervigon", teamName: "Lavistodes", flex: ["Helbrecht"], autoFlex: false });
    assert.equal(refreshed, 1);
    fireEvent.click(view.getByRole("button", { name: "Use recommended owned flex" }));
    assert.equal((view.getByLabelText("Flex slot 1") as HTMLSelectElement).value, "Atlacoya");
    assert.ok(view.getByText("AUTOMATIC OWNED FLEX"));

    fireEvent.change(view.getByLabelText("Meta team"), { target: { value: "Big Hit" } });
    assert.equal((view.getByLabelText("Flex slot 1") as HTMLSelectElement).value, "Gulgortz");
    assert.equal((view.getByLabelText("Flex slot 2") as HTMLSelectElement).value, "Atlacoya");
    assert.equal(upgradeTable().getAllByRole("row").length, 6);
    assert.equal(within(view.getByLabelText("Flex slot 2")).queryByRole("option", { name: /^Gulgortz(?: Gulgortz)?$/ }), null);
    assert.equal((within(view.getByLabelText("Flex slot 1")).getByRole("option", { name: "Abaddon · not owned" }) as HTMLOptionElement).disabled, true);

    fireEvent.change(view.getByLabelText("Raid boss"), { target: { value: "Ghazghkull" } });
    assert.deepEqual([1, 2].map(slot => (view.getByLabelText(`Flex slot ${slot}`) as HTMLSelectElement).value), ["Aesoth", "Vitruvius"]);
    assert.equal(upgradeTable().queryByRole("link", { name: /^Gulgortz(?: Gulgortz)?$/ }), null);
    assert.equal(now().queryByText("Gulgortz"), null);
    assert.ok(now().getByText("Aesoth"));
    assert.ok(now().getByText("Vitruvius"));
    fireEvent.change(view.getByLabelText("Raid boss"), { target: { value: "Magnus" } });
    assert.deepEqual([1, 2].map(slot => (view.getByLabelText(`Flex slot ${slot}`) as HTMLSelectElement).value), ["Ragnar", "Helbrecht"]);
    assert.ok(view.getByText("RAID BUILD ORDER"));
    assert.ok(upgradeTable().getByRole("link", { name: /^Helbrecht(?: Helbrecht)?$/ }));
});
