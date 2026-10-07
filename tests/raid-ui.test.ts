import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { JSDOM } from "jsdom";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import GuildRaidPlanner from "../app/guild-raid/GuildRaidPlanner";
import meta from "../config/raid_boss_meta.json";
import { raidCandidates } from "../src/domain/raidLineup";
import { RAID_MACHINES } from "../src/domain/raidMachine";
import { defaultRaidSelection, resolveRaidSelection, type RaidTeams } from "../src/domain/raidSelection";
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
    const names = new Set(Object.values(bosses).flatMap(teams => Object.values(teams).flatMap(team => raidCandidates(team))));
    const owned = new Set(["Kariyan", "Laviscus", "Trajann", "Gulgortz", "Aesoth", "Atlacoya", "Helbrecht", "Vitruvius", "Kharn", "Dante", "Ragnar", "Actus", "Exitor-Rho", "Tan Gi'da", "Anuphet", "Aleph-Null", "Ammuk", "Biovore", "Plagueburst Crawler", "Reanimator", "Galatian"]);
    const roster: RosterUnit[] = [...owned].map(name => ({ id: RAID_MACHINES.find(machine => machine.name === name)?.id ?? `synthetic-${name}`, name, rank: ["Kariyan", "Laviscus", "Trajann"].includes(name) ? 12 : 0,
        faction: "Synthetic", grandAlliance: "Imperial", rarity: "Legendary", xpLevel: 36, progressionIndex: 0, shards: 0, mythicShards: 0,
        abilities: [{ id: "active", level: ["Kariyan", "Laviscus", "Trajann"].includes(name) ? 36 : 1 }, { id: "passive", level: 36 }], items: [] }));
    const byName = new Map(roster.map(unit => [unit.name, unit]));
    const member = (name: string) => ({ name, id: `synthetic-${name}`, owned: owned.has(name), rank: byName.get(name)?.rank ?? null,
        rarity: "Legendary", xpLevel: 36, activeLevel: byName.get(name)?.abilities[0]?.level ?? null, passiveLevel: 36,
        activeTarget: "35", passiveTarget: "26", activeBasis: "Editorial planning target", passiveBasis: "Editorial planning target" });
    const teams = Object.fromEntries(Object.entries(bosses).map(([boss, teams]) => [boss,
        Object.fromEntries(Object.entries(teams).map(([name, team]) => [name, { ...team, members: raidCandidates(team).map(member) }]))]));
    assert.ok(names.has("Atlacoya"));
    let refreshed = 0;
    const router: AppRouterInstance = { bfcacheId: "synthetic", back() {}, forward() {}, push() {}, replace() {}, prefetch() {}, refresh() { refreshed++; } };
    const view = render(createElement(AppRouterContext.Provider, { value: router }, createElement(GuildRaidPlanner,
        { teams, source: meta._meta, roster, mainSelection: defaultRaidSelection(bosses, owned) })));
    const upgradeTable = () => within(view.getByRole("table"));
    const now = () => within(view.container.querySelector(".roadmapNow") as HTMLElement);

    fireEvent.change(view.getByLabelText("Raid boss"), { target: { value: "Tervigon" } });
    assert.equal((view.getByLabelText("Character slot 5") as HTMLSelectElement).value, "Atlacoya");
    assert.equal(view.getAllByLabelText(/Character slot/).length, 5);
    assert.equal((view.getByLabelText("Machine of War") as HTMLSelectElement).value, "Plagueburst Crawler");
    assert.equal(upgradeTable().getAllByRole("row").length, 6);
    assert.ok(upgradeTable().getByRole("link", { name: /^Atlacoya(?: Atlacoya)?$/ }));
    assert.equal(upgradeTable().queryByRole("link", { name: /^Aesoth(?: Aesoth)?$/ }), null);
    assert.match(now().getByText("Atlacoya").parentElement!.textContent!, /Active 1 → 35/);
    assert.ok(now().getAllByRole("link", { name: "Plan rank materials →" }).some(link => link.getAttribute("href") === "/farming?character=synthetic-Atlacoya&target=12"));

    fireEvent.change(view.getByLabelText("Character slot 5"), { target: { value: "Helbrecht" } });
    assert.ok(view.getByText("MANUAL LINEUP"));
    assert.equal(now().queryByText("Atlacoya"), null);
    assert.ok(now().getByText("Helbrecht"));
    let saved: unknown;
    globalThis.fetch = async (_input, init) => { saved = JSON.parse(String(init?.body)); return new Response('{"ok":true}', { status: 200 }); };
    fireEvent.click(view.getByRole("button", { name: "Set as main Raid team" }));
    await waitFor(() => assert.equal((view.getByRole("button", { name: "Main team saved" }) as HTMLButtonElement).disabled, true));
    assert.deepEqual(saved, { boss: "Tervigon", teamName: "Lavistodes", flex: ["Helbrecht"], lineup: ["Gulgortz", "Kariyan", "Laviscus", "Trajann", "Helbrecht"], autoFlex: false, machine: "Plagueburst Crawler", autoMachine: true });
    assert.equal(refreshed, 1);
    fireEvent.click(view.getByRole("button", { name: "Use recommended owned team" }));
    assert.equal((view.getByLabelText("Character slot 5") as HTMLSelectElement).value, "Atlacoya");
    assert.ok(view.getByText("AUTOMATIC OWNED TEAM"));

    fireEvent.change(view.getByLabelText("Meta team"), { target: { value: "Big Hit" } });
    assert.equal((view.getByLabelText("Character slot 4") as HTMLSelectElement).value, "Gulgortz");
    assert.equal((view.getByLabelText("Character slot 5") as HTMLSelectElement).value, "Atlacoya");
    assert.equal(upgradeTable().getAllByRole("row").length, 6);
    assert.equal(within(view.getByLabelText("Character slot 5")).queryByRole("option", { name: /^Gulgortz(?: Gulgortz)?$/ }), null);
    assert.equal((within(view.getByLabelText("Character slot 4")).getByRole("option", { name: "Abaddon · not owned" }) as HTMLOptionElement).disabled, true);

    fireEvent.change(view.getByLabelText("Raid boss"), { target: { value: "Ghazghkull" } });
    assert.deepEqual([4, 5].map(slot => (view.getByLabelText(`Character slot ${slot}`) as HTMLSelectElement).value), ["Aesoth", "Vitruvius"]);
    assert.equal(upgradeTable().queryByRole("link", { name: /^Gulgortz(?: Gulgortz)?$/ }), null);
    assert.equal(now().queryByText("Gulgortz"), null);
    assert.ok(now().getByText("Aesoth"));
    assert.ok(now().getByText("Vitruvius"));
    fireEvent.change(view.getByLabelText("Raid boss"), { target: { value: "Magnus" } });
    assert.deepEqual([4, 5].map(slot => (view.getByLabelText(`Character slot ${slot}`) as HTMLSelectElement).value), ["Ragnar", "Helbrecht"]);
    assert.ok(view.getByText("RAID BUILD ORDER"));
    assert.ok(upgradeTable().getByRole("link", { name: /^Helbrecht(?: Helbrecht)?$/ }));

    owned.delete("Vitruvius");
    const reducedTeams = Object.fromEntries(Object.entries(bosses).map(([boss, options]) => [boss,
        Object.fromEntries(Object.entries(options).map(([name, team]) => [name, { ...team, members: raidCandidates(team).map(member) }]))]));
    const reducedRoster = roster.filter(unit => unit.name !== "Vitruvius");
    const selection = resolveRaidSelection({ boss: "Riptide", teamName: "Ad-Mech", flex: [], autoFlex: true }, bosses, owned);
    view.rerender(createElement(AppRouterContext.Provider, { value: router }, createElement(GuildRaidPlanner,
        { key: "missing-core", teams: reducedTeams, source: meta._meta, roster: reducedRoster, mainSelection: selection })));
    assert.equal(upgradeTable().getAllByRole("row").length, 6);
    assert.ok(upgradeTable().getByRole("link", { name: /^Anuphet(?: Anuphet)?$/ }));
    assert.ok(upgradeTable().getByRole("link", { name: /^Gulgortz(?: Gulgortz)?$/ }));
    assert.equal(upgradeTable().queryByRole("link", { name: /^Trajann(?: Trajann)?$/ }), null);
    assert.equal(view.queryByRole("option", { name: /^Trajann/ }), null);
    assert.ok(now().getByText("Anuphet"));
    assert.ok(now().getAllByRole("link", { name: "Plan rank materials →" }).some(link => link.getAttribute("href") === "/farming?character=synthetic-Anuphet&target=12"));
    assert.equal((view.getByLabelText("Machine of War") as HTMLSelectElement).value, "Reanimator");
    fireEvent.change(view.getByLabelText("Machine of War"), { target: { value: "Galatian" } });
    fireEvent.click(view.getByRole("button", { name: "Set as main Raid team" }));
    await waitFor(() => assert.equal((saved as { machine: string }).machine, "Galatian"));
    assert.equal((saved as { autoMachine: boolean }).autoMachine, false);
    assert.equal((saved as { lineup: string[] }).lineup.length, 5);
    fireEvent.click(view.getByRole("button", { name: /^Machine of War plan/ }));
    assert.equal(view.getByRole("button", { name: /^Machine of War plan/ }).getAttribute("aria-expanded"), "false");
    fireEvent.click(view.getByRole("button", { name: /^Machine of War plan/ }));
    assert.equal((view.getByLabelText("Machine of War") as HTMLSelectElement).value, "Galatian");
});
