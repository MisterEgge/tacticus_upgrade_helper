import assert from "node:assert/strict";
import test from "node:test";
import { currencyClass, isActionableOffer, offerEligibility, shopAccountContext, recordState, refreshesLoggedToday, scheduleLabel, scheduledOn, sourceMatch, sourcesForItem, equipmentOffersForItem, validateRecord, type ShopCatalog, type ShopOffer, type ShopRecord } from "../src/domain/shops";

const offer = (itemId = "I_Test_L001"): ShopOffer => ({ id: `guild:1:${itemId}`, slot: 1, itemId, quantity: 1, schedule: "0 0 0 ? * MON,WED *", cost: { currency: "guildCredits", amount: 100 }, maxPurchases: 1, conditions: {}, weight: null });
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

test("equipment opportunities retain exact versus pool, weekday, price and ad refresh evidence",()=>{
    const offers=equipmentOffersForItem("I_Test_L001",catalog,52);
    assert.equal(offers.length,2);
    assert.equal(offers[0]?.rotation,"Monday / Wednesday (UTC)");
    assert.equal(offers[0]?.price,"100 Guild Credits");
    assert.equal(offers[0]?.adRefresh,true);
    assert.equal(offers[0]?.match,"exact");
    assert.equal(offers[1]?.match,"pool");
    assert.deepEqual(equipmentOffersForItem("unknown",catalog,52),[]);
});

test("equipment opportunities omit locked offers and mark unknown access and rotations",()=>{
    const source:ShopCatalog={...catalog,shops:[{...catalog.shops[0]!,offers:[
        {...offer(),conditions:{minPowerLevel:70}},
        {...offer(),id:"unknown",conditions:{lockId:"season"},schedule:"unknown"},
        {...offer(),id:"premium",cost:{currency:"gems",amount:50}}
    ]}]};
    const offers=equipmentOffersForItem("I_Test_L001",source,52);
    assert.equal(offers.length,1);
    assert.equal(offers[0]?.access,"unknown");
    assert.equal(offers[0]?.rotation,"Unknown rotation");
});

test("premium and real-money offers never become actionable acquisition sources", () =>
{

    const premium = { ...offer(), cost: { currency: "gems", amount: 50 } };
    const cash = { ...offer(), cost: { currency: "realMoney", amount: 5 } };
    assert.equal(currencyClass("guildCredits"), "in-game");
    assert.equal(currencyClass("gems"), "premium");
    assert.equal(isActionableOffer(premium), false);
    assert.equal(isActionableOffer(cash), false);
    const premiumOnly: ShopCatalog = { ...catalog, shops: [{ ...catalog.shops[0]!, offers: [premium] }] };
    assert.deepEqual(sourcesForItem("I_Test_L001", premiumOnly), []);
});

test("shop eligibility never assumes unrecognized locks are open", () =>
{
    assert.equal(offerEligibility({ ...offer(), conditions: { minPowerLevel: 20 } }, 10), "locked");
    assert.equal(offerEligibility({ ...offer(), conditions: { minPowerLevel: 20 } }, null), "unknown");
    assert.equal(offerEligibility({ ...offer(), conditions: { lockId: "event" } }, 100), "unknown");
});

test("Crusade roster eligibility distinguishes blue-star Legendary, Mythic and missing progress",()=>{
    assert.equal(shopAccountContext([{progressionIndex:15}],52).hasMythic,false);
    assert.equal(shopAccountContext([{progressionIndex:16}],52).hasMythic,true);
    assert.equal(shopAccountContext(null,52).hasMythic,null);
    assert.equal(shopAccountContext([{progressionIndex:99}],52).hasMythic,null);
    assert.equal(shopAccountContext([{progressionIndex:99},{progressionIndex:16}],52).hasMythic,true);
    const mythicOffer={...offer(),conditions:{lockId:"lock_crusade_shop_owns_unit_at_mythic",minPowerLevel:20}};
    const lowerOffer={...offer(),conditions:{lockId:"lock_crusade_shop_does_not_own_unit_at_mythic"}};
    const before=shopAccountContext([{progressionIndex:15}],52),after=shopAccountContext([{progressionIndex:16}],52);
    assert.equal(offerEligibility(mythicOffer,52,before),"locked");
    assert.equal(offerEligibility(mythicOffer,52,after),"eligible");
    assert.equal(offerEligibility(mythicOffer,10,after),"locked");
    assert.equal(offerEligibility(mythicOffer,null,after),"unknown");
    assert.equal(offerEligibility(lowerOffer,52,before),"eligible");
    assert.equal(offerEligibility(lowerOffer,52,after),"locked");
    assert.equal(offerEligibility(lowerOffer,52,shopAccountContext(null,52)),"unknown");
});

test("Mythic accounts omit unresolved lower Crusade tiers while preserving other routes and verified offers",()=>{
    const conditional={...offer("itemsLegendary_I_Test"),id:"crusade:conditional",conditions:{lockId:"lock_crusade_shop_slot9_legendary_item"}};
    const source:ShopCatalog={...catalog,shops:[...catalog.shops,{...catalog.shops[0]!,id:"crusade",name:"Crusade Shop",offers:[conditional]}]};
    const before={...source,accountContext:shopAccountContext([{progressionIndex:15}],52)};
    const after={...source,accountContext:shopAccountContext([{progressionIndex:16}],52)};
    assert.ok(equipmentOffersForItem("I_Test_L001",before,52).some(row=>row.shop==="Crusade Shop"));
    assert.equal(offerEligibility(conditional,52,after.accountContext),"unknown");
    assert.deepEqual(sourcesForItem("I_Test_L001",after),["Guild Shop"]);
    assert.ok(equipmentOffersForItem("I_Test_L001",after,52).every(row=>row.shop==="Guild Shop"));
    const verified={...after,shops:[{...after.shops[1]!,offers:[{...conditional,conditions:{}}]}]};
    assert.deepEqual(sourcesForItem("I_Test_L001",verified),["Crusade Shop"]);
    assert.ok(equipmentOffersForItem("I_Test_L001",verified,52).some(row=>row.access==="eligible"));
    assert.equal(source.accountContext,undefined);
});

test("Mythic shop UI hides ambiguous Crusade gear by default and reveals it as reference",async suite=>{
    const {JSDOM}=await import("jsdom"),{createElement}=await import("react");
    const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost/"});
    const descriptors=new Map<string,PropertyDescriptor|undefined>();
    for(const key of ["window","self","document","navigator","HTMLElement","Node","Event","MutationObserver","localStorage"]){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key as keyof typeof dom.window]});}
    const {render,fireEvent,cleanup,act}=await import("@testing-library/react");
    suite.after(async()=>{await act(async()=>cleanup());dom.window.close();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
    const {default:ShopBrowser}=await import("../app/sources/ShopBrowser");
    const source:ShopCatalog={...catalog,accountContext:shopAccountContext([{progressionIndex:16}],52),shops:[catalog.shops[0]!,{...catalog.shops[0]!,id:"crusade",name:"Crusade Shop",offers:[{...offer("itemsLegendary_I_Test"),id:"crusade:conditional",conditions:{lockId:"slot-lock"}}]}]};
    const view=render(createElement(ShopBrowser,{catalog:source,labels:{},initialItem:"I_Test_L001",powerLevel:52,accountKey:"TEST"}));
    const rows=()=>view.container.querySelectorAll("table")[0]!.querySelectorAll("tbody tr");
    assert.equal(rows().length,2);
    const toggle=view.getByRole("checkbox",{name:"Show unverified Crusade tiers (reference)"});
    fireEvent.click(toggle);
    assert.equal(rows().length,3);
    assert.match(rows()[2]!.textContent!,/Crusade Shop.*Requirements unknown/);
    fireEvent.click(toggle);
    assert.equal(rows().length,2);
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

 test("Grand Ceremonial Knife has a Crusade pool route without claiming exact stock",async()=>{
 const {readFile}=await import("node:fs/promises");
 const live=JSON.parse(await readFile("data/game/shops.json","utf8")) as ShopCatalog;
 const rows=equipmentOffersForItem("I_Crit_L010",live,52);
 assert.ok(rows.some(row=>row.shop==="Crusade Shop"&&row.match==="pool"&&row.rotation==="Daily (UTC)"&&row.price==="715 Crusade Credits"&&row.adRefresh));
 assert.ok(rows.filter(row=>row.shop==="Crusade Shop").every(row=>row.access==="unknown"));
 });
