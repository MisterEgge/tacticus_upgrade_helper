# Tacticus Upgrade Helper — TODO

## Working policy
- Finish existing correctness/data-completeness TODOs before expanding new feature concepts.
- New feature ideas go to TODO; non-blocking cleanup/refactors go to Technical debt; fix hard correctness bugs immediately.
- Store/equipment recommendations must never treat real-money or Blackstone purchases as actionable. Only recommend acquisition through other in-game currencies/sources.


## Dashboard / Equipment
- [ ] Make every page's content sections independently collapsible, using the shared campaign chevron pattern. Keep title/count/action summaries visible and retain child expansion state when a parent is collapsed. Equipment and character equipment are the first rollout.
- [x] Expand Equipment with independent collapsible sections and visible per-character equip-now or shop acquisition actions, sharing inventory allocations with character detail pages.
- [ ] Review the new `/equipment-demand` view after more dashboard work. Decide whether it belongs inside Equipment, deserves its own nav entry, or should feed a dashboard card.
- [x] Match equipment demand and owned counts by stable item IDs rather than display names.

## Inventory / acquisition backlog
- [x] Track known shop rotations, refresh rules, prices and manually observed stock in a dedicated acquisition view; unknown Main/Event/Web shop catalogs remain explicitly unverified.
- [x] Add acquisition-currency classification for equipment/shop sources.
- [x] Suppress real-money and Blackstone item offers from actionable recommendations; only other in-game currencies can surface there.
- [x] Audit Cleanout using exact source faction/unit restrictions and slot types, protect planned and leveled copies, and make owned vs locked recipient reserves inspectable.
- [x] Validate Cleanout against the October 6 live report, preserving copy totals and leaving uncertain or situational equipment for manual review.
- [ ] Continue compatibility coverage as new characters and item types are added; unresolved cleanout rows must remain protected.
- [x] Prefer compatible higher-chance block items, checking actual refinement and booster stats before showing equip-now; retain lower-chance block items as situational alternatives.

## Next enhancements
- [x] Gate every default orb recommendation and roster orb filter by required shard coverage, label shard blockers first, and group the ready shopping list into independently collapsible rarity tiers from lowest to highest.
- [x] Make character screens concise: current rank/rarity, exact next action, practical ability stops and shared equipment choices; keep references and extra investment behind disclosures.
- [x] Default orb totals to rarity ascensions toward Legendary, retaining optional Legendary/Mythic star upgrades through a toggle.
- [x] Use verified, pinned in-game artwork beside resource names across equipment, materials, currencies, orbs, badges and shop offers; explicitly label unavailable exact equipment artwork.
- [x] Add top-three Onslaught honor choices per alliance using current reworked rewards, shard-ready orb shortages, rarity goals and active account plans. Keep sectors manual/unknown and Mythic optional.
- [x] Show a concise shard-ready orb queue with per-character costs, shared owned/needed/short totals for Imperial, Xenos and Chaos by rarity, and non-premium shop routes. Recalculate on sync and account for intervening shard-only promotions.
- [x] Include the selected Machine of War in Raid teams, fill missing meta character slots with owned substitutes, apply boss faction restrictions, and route upgrades through the actual five. Remove Trajann from account Ad-Mech choices and prefer mechanical substitutes such as Boss and Anuphet.
- [ ] Research machine-specific ability targets beyond the documented Biovore roadmap; keep unknown targets separate from character rank/badge costs.
- [x] Add actionable practical ability targets to character pages: next level, XP/rarity gates, badge cost/shortfall, combined demand, confidence and source records, with higher investment remaining optional.
- [ ] Add inventory demand: owned vs needed and recipient coverage.
- [ ] Build verified campaign-node/material dataset for the farming engine.
- [x] Add active navigation state; continue mobile polish.
- [x] Harden equipment preference/compatibility invariant and tests.

## Farming follow-up
- [x] Audit every farmable material without an unlocked Elite source, preserve unknown progress, and rank locked campaign opportunities by owned shortages and expected energy savings.
- [x] Add material completion through a selected rank ceiling, including recursive crafting, equipped slots, shared inventory and unowned demand.
- [x] Replace manually maintained campaign progress with official player API campaign progress.
- [x] Use upgrade-material inventory (not equipment inventory) when calculating rank-material shortages.
- [x] Validate campaign battle numbering/frontier semantics against the synced battle dataset and fresh live player analysis; campaign completion now derives from the synced playable endpoint.
- [x] Add multi-rank character goals so farming can plan beyond only the next rank.

## Game-wide ability research
- [x] Make the Abilities page cover the full synced character catalog, including unowned characters.
- [x] Separate practical breakpoint from high-investment target and show research confidence.
- [ ] Review every unreviewed character against current community discussion and ability scaling; never auto-fill unsupported targets.
- [ ] Add source/evidence metadata per character so recommendations can be re-audited after balance patches.
- [ ] Add Machines of War as a separate ability-investment dataset after the character roster is complete.

## Elite campaign planner
- [x] Cross-reference live Elite campaign progression with current mandatory-character ranks and ability levels.
- [x] Inspect checked-in official API schema: attempts/unlock indices only; star state remains unknown. Re-audit when schema updates.
- [x] Persist changed roster/progression observations, separate advances, and reject stale timestamps.
- [ ] Research community-efficient 3-star targets for every mandatory campaign character and separate carry vs survival-only investment.
- [x] Feed campaign target rank gaps into multi-rank farming demand.

## Remaining verification and evidence
- [x] Verify account analysis via the existing CI API secret and exercise production routes/farming calculations using its fresh report. Player exports and generated reports remain untracked.
- [ ] Complete interactive desktop/mobile browser checks; isolated production HTTP smoke tests pass, but the remote browser could not reach the local app.
- [ ] Research campaign-specific targets with cited sources before enabling automatic campaign-to-farming goals. Unverified numeric targets were removed.
- [ ] Display comparisons of schema-v2 historical observations in the campaign planner without implying causation.
- [ ] Review full ability catalog sources and keep Machines of War separate.

## Technical debt
- [x] Collapse duplicate campaign farming goals by stable character ID and keep the highest justified target.
- [x] Make low-confidence campaign targets display-only unless explicitly marked eligible for automatic farming.
- [ ] Consolidate duplicated campaign rank-name constants.
- [ ] Replace dense one-line page/component source where it materially hurts maintainability.
