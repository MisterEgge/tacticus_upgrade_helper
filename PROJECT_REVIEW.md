# Project review - 2026-10-21

Reviewed the Next.js pages, report/catalog loading, Onslaught domain rules, account-sync orchestration, ingestion scripts, and test coverage. This is a targeted code review, not an exhaustive audit of every game rule.

## Completed

- Onslaught now ranks up to three alternatives independently for each current character rarity within Imperial, Xenos and Chaos. All six rarity sections show an explicit empty state when no eligible choice exists. Mythic investment remains optional; blue-star Legendary characters retain their actual Legendary grouping.
- Reused one alliance partition instead of repeatedly scanning the candidate roster for membership and counts. Existing shared resource shortages, passive shard exclusions and War caps remain in effect.
- Added rarity coverage and independent collapse interaction tests.
- Made isolated HTTP and orb-ingestion fixtures work on Windows without privileged symbolic links. CLI loader arguments now use file URLs so Windows drive letters are not interpreted as URL schemes.
- Replaced stale fixed account-state assertions with configured planning recipients and a deterministic equipment scenario. The roster-wide equipment invariant audit remains.

## Verified follow-up gaps

1. **Report errors look like missing account data.** In app/lib/report.ts, getReport catches every exception, including invalid JSON, malformed roster entries and catalog failures, and returns null. Pages then suggest refreshing. Distinguish a missing file from a damaged report and log a sanitized diagnostic; add malformed-report fixtures before changing this shared behavior.
2. **Fixed: configuration caches now invalidate.** Catalog, ability guidance/evidence and campaign targets/evidence check file identity, size and timestamps on each request. Unchanged files reuse parsed data; edits and replacements reload without restarting. Missing or malformed configuration fails rather than silently returning a stale cached version. Regression coverage includes changed dependencies, replacement, parse failure/recovery and deletion.
3. **Multi-file refresh is not transactional.** fetchPlayer.ts overwrites player data before fetchGuildData.ts runs, and guild files are written separately. A later fetch/write failure preserves the previous report but can leave raw inputs from different refresh attempts. Stage a complete input snapshot before publishing it if consistent external/raw-data reads are required.
4. **Planning coverage can lag roster unlocks.** Uthar is currently owned without explicit planning guidance; the account has an additional unreviewed owned character beyond the earlier fixed-count test assumption. Configured guidance should be checked against new unlocks and missing targets shown explicitly. No targets were invented to fill this gap.

## Optimization boundary

Keep account-dependent calculations tied to the report timestamp and saved selections. Avoid permanent report caching: refreshes must become visible without rebuilding. Broader configuration caching should include invalidation rather than extending the existing lifetime caches.

## Orb priorities and page layout review - 2026-10-21

The primary shopping list previously used the full-roster readiness audit. This could budget a capped War-only unit or an untracked bench unit alongside actual priorities. The default shopping list now uses the same account-priority rules as the planner; the full-roster audit requires an explicit checkbox. Selected Raid core/flex retain precedence, followed by unfinished campaign targets, active War goals and useful planning floors. Shard prerequisites, rarity/star/Mythic gates, one allocation per shared pool, and union-based forge protection remain covered by regression tests. Display filtering happens after allocation; changing tabs cannot reassign stock or change the budgets of other alliances. Counts of waiting and unknown shard balances follow the selected alliance.

| Page | Layout decision |
| --- | --- |
| Dashboard | Keep the cross-mode action summary; alliance tabs would hide unrelated next actions. |
| Onslaught | Replace stacked alliance disclosures with three tabs and nested rarity sections; summarize empty rarities. |
| Orb priorities | Use alliance tabs with rarity shopping sections and an alliance-specific longer-term plan. |
| Badge Budget | Replace alliance accordion with tabs; show rarity totals once, then character actions. Normalize Imperium input to Imperial. |
| Campaigns | Keep independent campaign disclosures; campaign access is the planning boundary. |
| Characters | Keep roster search/filter controls and the shared progression display. |
| Character detail | Keep one-character action sections; no three-alliance grouping exists. |
| Elite farming gaps | Keep material/campaign filters and independent campaign opportunities. |
| Equipment upgrades | Keep team scope and allocation controls; shared gear must remain visible across recipients. |
| Equipment demand | Keep item-based demand grouping. |
| Farming | Keep character and target-rank controls. |
| Guild Raid | Keep boss/team/machine selection; alliances are not independent raid plans. |
| Inventory demand | Keep item/recipient planning. |
| Inventory Cleanout | Keep item restrictions, reserves and recipient scope. |
| Material Completion | Keep material search and rank ceiling. |
| Character Ratings | Keep roster-wide usefulness comparisons and existing filters. |
| Reallocation Audit | Keep donor/recipient comparisons together. |
| Review Coverage | Keep cross-mode research gaps visible. |
| Shops & Sources | Keep shop/item acquisition context. |
| Guild War | Keep independent offense and defense team assignments. |

Real-browser checks at a 390px viewport covered these 20 page routes, including a representative character detail. No page-level horizontal overflow was observed. Tab clicks were exercised on all three resource pages, with only one visible panel each. Desktop Onslaught and mobile resource-page screenshots were inspected locally. Keyboard navigation and preservation of nested expansion and sector settings are covered by interaction tests. This is a layout and orb-rule review, not verification of every game mechanic or every possible roster state.

## Player-facing copy cleanup - 2026-10-21

Removed duplicate Planning goal labels from orb rows; the progression badge comparison is the only visible target. A different longer-term target remains in Details, alongside priority reasons and stock allocations. Visible costs retain required orbs, shortfalls, shard balances and the blocking next action. Removed the repeated alliance summary card above rarity totals.

Consolidated Onslaught instructions and reward-chance notes, moved campaign methodology out of repeated rows, removed repeated Raid ability levels and dashboard timestamps, shortened ability target labels, simplified unrated-character language, and removed duplicate material/cleanout counters and internal battle IDs beside visible battle numbers. Equipment reasons remain available under Why this item; shop stock uncertainty is stated once above the offer list. The changes affect presentation only: recommendation scoring, resource allocation, inventory protection, upgrade costs and eligibility are unchanged.
