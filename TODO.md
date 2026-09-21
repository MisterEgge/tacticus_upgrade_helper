# Tacticus Upgrade Helper — TODO

## Working policy
- Finish existing correctness/data-completeness TODOs before expanding new feature concepts.
- New feature ideas go to TODO; non-blocking cleanup/refactors go to Technical debt; fix hard correctness bugs immediately.
- Store/equipment recommendations must never treat real-money or Blackstone purchases as actionable. Only recommend acquisition through other in-game currencies/sources.


## Dashboard / Equipment
- [ ] Review the new `/equipment-demand` view after more dashboard work. Decide whether it belongs inside Equipment, deserves its own nav entry, or should feed a dashboard card.
- [ ] Improve equipment demand matching so owned counts use stable item IDs instead of display names wherever possible.

## Inventory / acquisition backlog
- [ ] Add acquisition-currency classification for equipment/shop sources.
- [ ] Suppress real-money and Blackstone item offers from actionable recommendations; user will only spend other in-game currencies on items.
- [ ] Finish game-wide equipment compatibility evidence before promoting unresolved cleanout rows to scrap-safe.
- [ ] Validate inventory cleanout against fresh live inventory after compatibility coverage is complete.

## Next enhancements
- [ ] Add immediate/community ability targets to character detail pages.
- [ ] Add inventory demand: owned vs needed and highest-priority recipients.
- [ ] Build verified campaign-node/material dataset for the farming engine.
- [ ] Add active navigation state and continue mobile polish.
- [x] Harden equipment preference/compatibility invariant and tests.

## Farming follow-up
- [x] Replace manually maintained campaign progress with official player API campaign progress.
- [x] Use upgrade-material inventory (not equipment inventory) when calculating rank-material shortages.
- [ ] Validate campaign battle numbering against a fresh live player response and synced battle dataset.
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
