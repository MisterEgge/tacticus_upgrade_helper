import assert from "node:assert/strict";
import test from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import meta from "../config/raid_boss_meta.json";
import {raidSideBosses, sideBossSource} from "../src/domain/raidSideBosses";
import RaidSideBossGuide from "../app/guild-raid/RaidSideBossGuide";

test("every selectable raid boss has two distinct, sourced supporting encounters",()=>{
    for (const boss of Object.keys(meta.bosses)) {
        const battles=raidSideBosses(boss);
        assert.ok(battles, boss);
        assert.equal(battles.bosses.length,2,boss);
        assert.equal(new Set(battles.bosses.map(x=>x.page)).size,2,boss);
        for(const battle of battles.bosses){
            assert.equal(battle.tips.length,2);
            assert.ok(battle.approach && battle.benefit);
            assert.ok(new URL(sideBossSource(battle.page)).pathname.endsWith("GR"));
        }
    }
    assert.equal(raidSideBosses("Unknown boss"),null);
    assert.notEqual(raidSideBosses("Tervigon")!.bosses[0]!.page,raidSideBosses("Hive Tyrant")!.bosses[0]!.page);
    assert.match(raidSideBosses("Tervigon")!.bosses[0]!.benefit,/splash/);
    assert.match(raidSideBosses("Hive Tyrant")!.bosses[0]!.benefit,/Stranglethorn/);
});
test("Screamer side fights show distinct vulnerabilities and source links without a main-boss rotation",()=>{
    const dom=new JSDOM(renderToStaticMarkup(createElement(RaidSideBossGuide,{boss:"Screamer-Killer"})));
    const cards=[...dom.window.document.querySelectorAll("article")];
    assert.equal(cards.length,2);
    assert.match(cards[0]!.textContent!,/melee damage/);
    assert.match(cards[1]!.textContent!,/Flame or Blast/);
    assert.equal(cards[0]!.querySelector("a")!.href,sideBossSource("NeurothropeGR"));
    assert.equal(cards[1]!.querySelector("a")!.href,sideBossSource("WingedPrimeGR"));
    assert.equal(dom.window.document.querySelector("details")!.open,false);
    assert.equal(dom.window.document.querySelector("button")===null,true);
    assert.match(dom.window.document.body.textContent!,/Tyranids cannot deploy/);
    dom.window.close();
});
test("unknown bosses do not inherit another encounter's advice",()=>{
    const html=renderToStaticMarkup(createElement(RaidSideBossGuide,{boss:"New boss"}));
    assert.match(html,/No researched side-boss guide/);
    assert.equal(html.includes("Neurothrope"),false);
});
