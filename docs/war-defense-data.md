# Defense data and selection

The current snapshot is imported from the owner's saved TacticusXYZ defender page. It includes the 20 displayed cores, their counts, and individual flex counts. The HTML is server-rendered: the saved report contains the table and hidden flex win counts, without needing to call a JSON API. No supported public API has been confirmed.

Refresh the snapshot after loading the defender page in your browser and saving it as HTML:

```powershell
npm.cmd run import:war-defense -- "C:\path\to\defender-page.html"
```

Only aggregate statistics, source scope, import time and a source checksum are written to `config/war_defense_evidence.json`. Scripts are never executed. Raw saved pages may contain account details and session tokens; root-level Cores & Flex Units HTML exports and their asset folders are ignored. Keep All Results selected: outcome-filtered exports are rejected.

The supplied snapshot has no battlefield, season or map filters selected. The source describes its counts as follow-up/debuffed attacks, with wins meaning holds. These counts must not be represented as first-attack defense results, Battlefield 2/Fortified-specific results, or results for the assembled five-character lineup. Two flex cohorts overlap and cannot be added or multiplied to produce a team win rate.

Selection ranks cores by actual observed defense rate (holds / attacks), then attempts. For each of two Gold slots followed by three Silver slots, it skips missing or already used core characters and requires current Gold I/Silver I ranks respectively. Flex observations need at least 100 attacks and are assigned globally by observed hold rate, then sample size; unowned, under-ranked and previously used characters are excluded. Gold characters may fill Silver slots. Every successful assignment consumes five distinct characters; if flex pools overlap too much, the planner keeps the largest possible set of complete teams and leaves other slots explicitly unfilled. Extra flex options go to one team only, favoring its highest observed hold rate and sample size. The 100-attack floor reduces tiny-sample recommendations; repeated battles are not independent player samples.

The defense tab groups the observed Core 3, rank-matched flex, and below-rank flex options. Selecting an alternative replaces one of the two active flex members; readiness and observed hold rate/sample size remain visible, and the lineup is saved in this browser. If a Gold slot is open, a build-toward-Gold section finds owned source-backed lineups without reusing the currently assigned defense characters, shows each member's Gold I readiness, and lists remaining source-supported character priorities when a complete five is unavailable. These are development paths, not measured five-character lineups. Offense suggestions similarly avoid assigning a flex character to multiple source cores. Recorded exact five-character results retain their own statistics; core/flex suggestions show core evidence only. Default offense slots are chosen from the rate-sorted distinct options rather than preferring a particular evidence type. A collapsed Potential unlocks list surfaces unowned characters with source rates plus known campaign/shop shard routes; shop data is a schedule catalog, not live stock.

All account resource views use the same selected defense teams and explicit tiers. Legacy historical source files remain for reference and tests; active defense no longer reads them.

Machine of War observations are absent from this export. The app offers manual owned-machine choices with current ability levels and persists them, enforcing one use per machine within defense. It does not label a machine as statistically best without team/machine observations. Completing that recommendation requires additional matchup data; usage alone cannot establish best performance. See the [machine investment assessment](machine-investment-assessment-2026-10-23.md) for role-specific spending judgments and integration requirements.

The current owner context is Battlefield 2, Fortified Position (+10% armour/damage). This is planning context, not a filter applied to the pooled snapshot. A separate filtered export would be needed to compare Battlefield 2 against the broader pool.

## Silver/Gold readiness targets

Readiness badges use the planner's Silver and Gold lineup targets: Silver uses Rare 1 red star progression and ability level 26; Gold uses Epic 3 red stars and ability level 35. These breakpoints match the progression catalog and ability rarity caps in `src/domain/characterProgression.ts` and `src/domain/abilityCosts.ts`. Ability display uses the lower of the lineup target and the unit's own rarity cap, so Silver abilities top out at 26/26 while lower-rarity units can have a lower natural cap. Progression shows the actual badge alongside the Silver Rare 1 red star or Gold Epic 3 red star target. Rank badges show the actual rank and the lineup's minimum rank (Silver I or Gold I); these are minimum rank requirements, not a game-imposed maximum rank.

Guild War's official zone rules are more specific than the planner's two rank-based lineup categories: the [Guild War wiki](https://tacticus.wiki.gg/wiki/Guild_War#War_Zones) lists Battlefield 2 Fortified Position as Veteran, with two Epic and three Rare slots. So these Silver/Gold markers are account-planning readiness targets, not a claim that every deployed slot in a live zone shares one rarity cap. Always follow the actual zone and slot rarity shown in game.
# Deployment order

Machine pairing is assessed separately in [War defense machine recommendations](war-defense-machines.md). Suggested assignments use owned-machine ability fit, preserve manual choices and enforce uniqueness; core/flex rates do not become machine win rates.

The numbered deployment editor is separate from core/flex selection and its statistics. Reordering does not change membership, evidence counts, upgrade targets or assigned machines. Orders are saved locally by the sorted five character IDs; stale or invalid permutations are discarded. Reset restores the starting order.

Slot order affects spawn hexes and AI sequence, but movement, targets and ability decisions remain map dependent. The app does not claim an optimal AI combo. Teams retain source order unless a specific heuristic applies: Rotbone is placed fourth to give advancing teammates a chance to move before healing. This is planning judgment, not a measured result; adjust it after checking reach on the map.

Sources: [community defense discussion](https://www.reddit.com/r/WH40KTacticus/comments/1t2zgo6/gw_defense_lineups_advice/) and [numbered map explanation](https://www.reddit.com/r/WH40KTacticus/comments/1pjbzic/guild_war_maps_s19_b1/). Generic Fortified Position does not identify a unique map; use the current war's actual starting hexes. Summon phases and passive auras should not be treated as guaranteed character active sequences.

Defense teams are collapsible to reduce page length. Each summary shows the five current portraits, core hold evidence, and machine choice; expanding reveals the Core 3 and flex groups, readiness marks, deployment order, and machine controls. Alternative flex membership is editable without changing the source core evidence or presenting it as a measured five-character result.
