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
2. **Static configuration caches persist until restart.** app/lib/catalog.ts keeps catalog and ability guidance in process-wide caches. Editing configuration or replacing the catalog while the server runs can leave recommendations stale. Account report reads are fresh, but configuration reads are not. Add file-version invalidation if live catalog/config updates are intended.
3. **Multi-file refresh is not transactional.** fetchPlayer.ts overwrites player data before fetchGuildData.ts runs, and guild files are written separately. A later fetch/write failure preserves the previous report but can leave raw inputs from different refresh attempts. Stage a complete input snapshot before publishing it if consistent external/raw-data reads are required.
4. **Planning coverage can lag roster unlocks.** Uthar is currently owned without explicit planning guidance; the account has an additional unreviewed owned character beyond the earlier fixed-count test assumption. Configured guidance should be checked against new unlocks and missing targets shown explicitly. No targets were invented to fill this gap.

## Optimization boundary

Keep account-dependent calculations tied to the report timestamp and saved selections. Avoid permanent report caching: refreshes must become visible without rebuilding. Broader configuration caching should include invalidation rather than extending the existing lifetime caches.
