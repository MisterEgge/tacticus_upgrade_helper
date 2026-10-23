# Defense data and selection

The current snapshot is imported from the owner's saved TacticusXYZ defender page. It includes the 20 displayed cores, their counts, and individual flex counts. The HTML is server-rendered: the saved report contains the table and hidden flex win counts, without needing to call a JSON API. No supported public API has been confirmed.

Refresh the snapshot after loading the defender page in your browser and saving it as HTML:

```powershell
npm.cmd run import:war-defense -- "C:\path\to\defender-page.html"
```

Only aggregate statistics, source scope, import time and a source checksum are written to `config/war_defense_evidence.json`. Scripts are never executed. Raw saved pages may contain account details and session tokens; root-level Cores & Flex Units HTML exports and their asset folders are ignored. Keep All Results selected: outcome-filtered exports are rejected.

The supplied snapshot has no battlefield, season or map filters selected. The source describes its counts as follow-up/debuffed attacks, with wins meaning holds. These counts must not be represented as first-attack defense results, Battlefield 2/Fortified-specific results, or results for the assembled five-character lineup. Two flex cohorts overlap and cannot be added or multiplied to produce a team win rate.

Selection ranks cores by actual observed defense rate (holds / attacks), then attempts. For each of two Gold slots followed by three Silver slots, it skips missing or already used core characters and requires current Gold I/Silver I ranks respectively. Flex picks use the Wilson 95% lower bound to account for sample size, excluding unowned, under-ranked and previously used characters. Gold characters may fill Silver slots. Every successful assignment consumes five distinct characters; unfilled slots remain explicitly unfilled. This follows a greedy core-first selection, not a claim of globally optimal combined team performance. Repeated battles are not independent player samples; Wilson is a ranking heuristic here.

All account resource views use the same selected defense teams and explicit tiers. Legacy historical source files remain for reference and tests; active defense no longer reads them. Offense selection is unchanged.

Machine of War observations are absent from this export. The app offers manual owned-machine choices with current ability levels and persists them, enforcing one use per machine within defense. It does not label a machine as statistically best without team/machine observations. Completing that recommendation requires additional matchup data; usage alone cannot establish best performance. See the [machine investment assessment](machine-investment-assessment-2026-10-23.md) for role-specific spending judgments and integration requirements.

The current owner context is Battlefield 2, Fortified Position (+10% armour/damage). This is planning context, not a filter applied to the pooled snapshot. A separate filtered export would be needed to compare Battlefield 2 against the broader pool.
# Deployment order

Machine pairing is assessed separately in [War defense machine recommendations](war-defense-machines.md). Suggested assignments use owned-machine ability fit, preserve manual choices and enforce uniqueness; core/flex rates do not become machine win rates.

The numbered deployment editor is separate from core/flex selection and its statistics. Reordering does not change membership, evidence counts, upgrade targets or assigned machines. Orders are saved locally by the sorted five character IDs; stale or invalid permutations are discarded. Reset restores the starting order.

Slot order affects spawn hexes and AI sequence, but movement, targets and ability decisions remain map dependent. The app does not claim an optimal AI combo. Teams retain source order unless a specific heuristic applies: Rotbone is placed fourth to give advancing teammates a chance to move before healing. This is planning judgment, not a measured result; adjust it after checking reach on the map.

Sources: [community defense discussion](https://www.reddit.com/r/WH40KTacticus/comments/1t2zgo6/gw_defense_lineups_advice/) and [numbered map explanation](https://www.reddit.com/r/WH40KTacticus/comments/1pjbzic/guild_war_maps_s19_b1/). Generic Fortified Position does not identify a unique map; use the current war's actual starting hexes. Summon phases and passive auras should not be treated as guaranteed character active sequences.

Defense now displays each character once in a horizontal five-portrait strip, with the name underneath. Current rank and only unfinished ability/gear needs appear in that same card. Edit order reveals the move controls. Machine selection sits alongside the strip on desktop; its reasoning is collapsed. The separate flex table, repeated roster table and full-team name heading have been removed.
