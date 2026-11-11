import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { JSDOM } from "jsdom";
import GuildWarCounterGuide from "../app/war-defense/counters/GuildWarCounterGuide";
import type { GuildWarCounterKnowledge } from "../src/domain/guildWarCounters";

test("counter guide shows all roster units and qualifies similar-team results", async suite =>
{

    const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost/" });
    const descriptors = new Map<string, PropertyDescriptor | undefined>();
    for (const key of ["window", "self", "document", "navigator", "HTMLElement", "Node", "Event", "MutationObserver"])
    {

        descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
        Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key as keyof typeof dom.window] });

    }

    const { render, fireEvent, cleanup, act, within } = await import("@testing-library/react");
    suite.after(async () =>
    {

        await act(async () => cleanup());
        dom.window.close();
        for (const [key, descriptor] of descriptors)
        {

            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);

        }

    });

    const characters = JSON.parse(readFileSync("data/character_catalog.json", "utf8")).characters;
    const knowledge = JSON.parse(readFileSync("config/guild_war_counters.json", "utf8")) as GuildWarCounterKnowledge;
    const view = render(createElement(GuildWarCounterGuide, { characters, knowledge }));
    fireEvent.click(view.getByRole("tab", { name: "By unit" }));
    assert.equal(view.getByLabelText("Defending units").querySelectorAll("button").length, 112);
    fireEvent.click(view.getByRole("tab", { name: "Build counter plan" }));
    const fullTeam = within(view.getByRole("tabpanel", { name: "Build counter plan" }));
    for (const [index, id] of ["blackTerminator", "deathBlightlord", "worldKharn", "deathRotbone", "deathTyphus"].entries())
    {

        fireEvent.change(fullTeam.getByLabelText(`Defender ${index + 1}`), { target: { value: id } });

    }

    assert.ok(fullTeam.getAllByText("Bypass Terminator Armour's first-Attack reduction").length > 0);
    assert.ok(fullTeam.getAllByText("Psychic basic attacks").length > 0);
    assert.ok(fullTeam.getAllByText(/Mechanic match only — not a tested Guild War result/).length > 0);
    assert.ok(fullTeam.getAllByText("Maladus — Flail Swing active").length > 0);
    assert.ok(fullTeam.getByText("Death Guard defense cohort"));
    assert.ok(fullTeam.getByText(/86\.1% clears/));
    assert.ok(fullTeam.getByText(/not isolate this exact defense or split results by Gold\/Silver tier/));

});
