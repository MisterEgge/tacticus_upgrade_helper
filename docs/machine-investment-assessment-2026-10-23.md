# Machine of War investment assessment

Reviewed October 23, 2026. Covers all 11 machines currently recognized by this app. This is an assessment and proposed planning policy; it does not change live resource allocations or spend resources. The accompanying small War fix prevents duplicate machine assignments; machine resource-planner integration remains to be implemented.

## Decisions

Do not give every machine a generic ability target or rarity goal. Choose a role first, then the cheapest ability/rarity investment that achieves it. Unlock value, damage scaling and Mythic support are separate decisions. Being selected in War or Arena does not itself justify expensive upgrades.

Preserve this account's Raid-first preference. Prioritize the machine used by the selected Raid strategy, plus a specific counter needed to overcome a demonstrated blocker. Honor machines in Onslaught when shards unlock one of those goals; do not farm shards merely because a machine is available to honor. Machines and characters share alliance orbs and ability badges, so their demands must compete in one reservation order.

Community feedback is qualitative, not an exhaustive vote or measured universal tier list. Older comments predate reworks, Mythic and Reanimator. Exact targets below are either verified mechanical breakpoints or explicitly conditional planning suggestions. An anecdotal damage increase does not establish a guaranteed return.

## Assessment of each machine

| Machine | Useful roles | Ability investment and stopping rule | Rarity/orb judgment |
|---|---|---|---|
| **Biovore** | Arena/Onslaught distractions; War control; Raid positioning and eligible damage amplification | **1/1 is sufficient for basic distraction**, not a universal endgame target. For Raids, raise the ability used by the actual rotation until mines reliably do the needed damage or survive long enough. Do not automatically buy equal levels in both abilities. | A leading Mythic candidate for the relevant Raid team, **once Mythic attackers can benefit** and mines can damage the boss. Legendary/Mythic is unnecessary just to provide disposable distractions. Boss faction restrictions still apply. |
| **Forgefiend** | Fire-based movement control; Arena/War summon removal; Raid summon clearing | Secondary **1** retains terrain-control utility. Primary needs damage investment for killing summons. Set its target from current enemy health/armour, machine stars and minimum damage, not a universal 48. Invest further in the secondary only when its damage contributes to an actual goal. | Ascend to the ability cap needed for the verified kill threshold. Do not force Mythic for fire placement or assume its defensive Mythic effect is a Raid damage buff. |
| **Reanimator** | Mechanical Raid teams, summon reactivation and repair; situational mechanical War/Arena support | Primary **36** is a real breakpoint: reactivated summons use 100% of their damage, **still subject to a damage cap**. Further levels can raise that cap and repair/revive health. Secondary levels should cover the required health/repair role; no universal numeric target is established. | Legendary enables level 36. Mythic becomes a separate consideration when affected Mythic mechanical characters benefit. Do not promote it for a team that cannot use its protocols or for an illegal boss matchup. |
| **Galatian** | Mechanical attacks, boss pinning and an extra deployed unit; War/Arena reinforcement | Primary investment matters when the deployed unit must survive or deal meaningful damage. Stop at the survival/positioning requirement of the encounter. Secondary damage is an independent investment; no evidence supports universally buying both to the same level. | Conditional on a strategy actually using Galatian. Its Mythic effect reduces damage under adjacency conditions; it is not interchangeable with Reanimator's damage support. Old Ad-Mech advice is not a universal current recommendation. |
| **Z'Kar** | Psyker Raid support and deployment attacks; psychic/fire interactions in Arena, War and Onslaught | Primary is the main investment for a deployment-based Raid strategy. Its useful level depends on encounter damage and survival. Secondary is independently useful for exploiting psychic hits/fire. Do not turn one player's 60-level target into a requirement for every account. | Mythic is compelling for a developed **Mythic psyker** team that satisfies adjacency conditions. Defer for a non-psyker main team. Include the munitions required to execute the rotation. |
| **Plagueburst Crawler** | Contamination setup and suppression; Mythic damage support for compatible Raid plans; situational War control | Secondary contamination coverage increases at **9, 18, 27 and 36**. Level 36 gives seven total contaminated hexes. Buy only the coverage needed; primary damage requires a separate qualifying target/armour-debuff plan. | Mythic support requires Mythic allies standing on contaminated hexes. Consider the armour/survival consequences of contamination and positioning. It is a conditional alternative, not an automatic second Mythic machine. |
| **Exorcist** | Ranged attacks into fire, Sororitas synergy and conditional Raid/PvP support | Primary **36** reaches **20% damage and five-round duration** in the pinned data. Above 36, this percentage/duration does not improve; additional levels buy damage. Secondary levels support damage and Act of Faith interactions only when useful. | Legendary enables this breakpoint. Mythic provides a conditional shield, not another primary percentage breakpoint. Do not automatically push it past a sufficient Legendary support role. |
| **Storm Speeder** | Ranged/Overwatch support, Dark Angels interactions; situational War/Arena use | Secondary provides **10% added pierce at 1**, **12% at 18**, **15% at 36**. Primary's Dark Angels bonus is **20%, 25%, 33%** at those levels. Choose the relevant ability; 36 is a conditional breakpoint, not a default goal for both. | Rare/Legendary only when the next percentage breakpoint or accompanying damage is valuable to a selected team. Mythic defensive support is not a general priority for a Raid-first melee account. |
| **Tson'ji** | Markerlight setup, specific attack interactions and situational enemy-machine disruption | Keep **1/1 for the low-investment utility profile**. The secondary first damages enemies **already** carrying Markerlight and then marks its chosen target. Therefore a fresh unmarked target is not automatically hit by that cast. A Terminator first-hit plan must verify a real hit, its timing and current trait rules. | No automatic ascension, optional-star or Mythic goal for this utility role. Damage upgrades and primary machine-disruption chances are separate conditional uses, not proof that it is never worth investment. |
| **Malleus Rocket Launcher** | Disposable Guardsmen, Overwatch bait and long-fight support in Onslaught/War; suppression utility | **1/1 for sacrificial summons/control**. Improve the secondary when Guardsmen need to survive or contribute damage, and the primary when its barrage needs to do real damage. A cheap summon is not a reason to fund both abilities. | No blanket Legendary/Mythic recommendation. Its Mythic benefit is conditional ranged-damage support, so do not dismiss it universally or promote it for a melee team's unrelated goal. |
| **Rukkatrukk** | Melee/Ork configurations, conditional summons and movement traps | Secondary placement changes at **18 and 36**; these values count additional marked hexes, not an identical total-coverage rule to Plagueburst. Damage investment requires a realistic trigger/movement plan. Primary requires nearby friendly units/Orks; no generic Raid damage return is established. | Mythic supports normal melee attacks by Mythic characters under adjacency conditions. Special attacks do not automatically inherit this benefit. Defer unless a chosen strategy demonstrates the advantage over the alternatives. |

Mechanics for these rows were checked against pinned upstream [ability data](https://github.com/svehera/tacticusplanner/blob/e57636ed77957d68cc80cbd729f76e51338a16d6/src/fsd/4-entities/abilities/data/new-ability-data.json), [machine identities](https://github.com/svehera/tacticusplanner/blob/e57636ed77957d68cc80cbd729f76e51338a16d6/src/fsd/4-entities/mow/data/new-mows-data2.json) and [machine recipes/costs](https://github.com/svehera/tacticusplanner/blob/e57636ed77957d68cc80cbd729f76e51338a16d6/src/fsd/4-entities/mow/data/new-mow-data.json). This is community-maintained game data, not a Snowprint guarantee. The wiki caps corroborate the role descriptions, while the upstream per-level arrays establish the exact 18/36 transitions.

## What this means for this account

Keep the selected Raid team's needs ahead of collecting levels on all eleven machines. Biovore remains relevant to the existing Big Hit plan, but its Mythic damage-amplification case needs eligible Mythic attackers. Without those attackers, the new support effect has no immediate beneficiary; higher mine damage can still have separate value. Do not reserve orbs for the Mythic effect as though it already improves every character.

Treat Forgefiend as a separate blocker-driven project when summon removal is preventing useful attacks. A current [Cawl discussion](https://www.reddit.com/r/WH40KTacticus/comments/1wlm2us/infographic_guild_raid_guide_season_110_brings/) reports different thresholds from the older level-48 shorthand. This is evidence to calculate the encounter, not a substitute for current enemy stats. Reanimator is a conditional project for an actively used mechanical team; Z'Kar for an actively used psyker team. These three should not all receive full budgets simply because they are owned.

Leave Tson'ji and other already-sufficient utility profiles out of the spending queue. Preserve their deployment usefulness in team selection. Use Incursion and Onslaught according to the machine's actual alliance and the shard goal; the alliance of the characters used to clear an Incursion is a different field.

## Resource assessment

Machine and character ability costs are different. For **one machine ability**, the pinned table gives:

| Level interval | Alliance ability badges | Components | Forge badges | Salvage |
|---|---:|---:|---:|---:|
| 1 → 8 | 7 Common | 11 | 0 | 35 |
| 8 → 17 | 9 Uncommon | 37 | 9 Uncommon | 0 |
| 17 → 26 | 9 Rare | 67 | 9 Rare | 0 |
| 26 → 35 | 9 Epic | 135 | 9 Epic | 0 |
| 35 → 50 | 60 Legendary | 473 | 60 Legendary | 0 |
| 50 → 60 | 20 Mythic | 500 | 20 Mythic | 0 |

These exclude the machine-specific upgrade ingredients and coins, which must also be budgeted. A 35 → 36 step requires one Legendary alliance badge, one Legendary forge badge, 20 components and that ability's recipe, plus coins. Primary and secondary recipes can differ. The third Mythic ability must be modeled according to rarity/stars, not charged as a third ordinary ability from 1 to 60.

The pinned Legendary coin total differs from the wiki's aggregate table. Do not silently merge those sources or label a complete spend affordable before reconciling coin costs. Machines have rarity-based caps but no character XP-level gate. Raw ability arrays can contain entries beyond the currently supported level cap; do not enable hypothetical levels simply because an array is longer.

Our report currently exposes orbs, alliance ability badges and upgrade inventory. The inspected player export already includes `inventory.components` (grandAlliance/amount) and `inventory.forgeBadges` (rarity/amount), but `analyzePlayer.ts` does not carry them into the report. Add and normalize those existing fields. No coin/salvage stock field was found in the inspected response; absent stock must remain unknown, never zero or an assumption of affordability. Recheck the current schema when integrating. [Official API reference](https://github.com/SnowprintStudios/tacticus-api).

Verify machine progression/shard costs against the current data before sharing ascension code. Do not attach character-only Mythic Journey or relic mission rewards to machines without evidence that those rewards exist for them.

## Onslaught assessment

Machines deployed in the battle can be honored under the current [Onslaught rules](https://tacticus.wiki.gg/wiki/Onslaught). Older Incursion reward analyses claiming that machines cannot be honored are stale and must not drive recommendations.

The candidate list needs a verified machine registry, correct alliance, progression and shard balances. Rank machines against characters using the value of the next justified milestone, not the character utility tier or a fabricated character rank. A machine at its utility stopping point should not consume an honor slot for development unless its reward stage is separately useful for resource farming. Preview sector rewards; do not promise exact days from a random shard range or assume a machine was deployed.

Verify deployment eligibility for the selected Onslaught track separately. Do not infer it from the alliance used to clear that machine's Incursion, or copy faction rules from another game mode.

## War and Arena assessment

Low-level deployment value and upgrade value must remain distinct. Defense AI's free primary use differs from a manually executed offensive rotation; delayed targeting and summon placement can change practical value.

**War UI correction included:** the previous selector permitted the same machine on multiple defense teams. The current [deployment reference](https://tacticus.wiki.gg/wiki/Machines_of_War) specifies one use per machine on defense and one on offense. The defense selector now disables conflicting choices and rejects duplicate/unowned/obsolete saved assignments. Apply the same separate-side rule when adding the offense machine selector. Do not carry repeated-machine infographic alternatives into simultaneous legal deployments.

The imported defender core/flex snapshot has no machine-conditioned results. Community synergy can justify a labeled suggestion, but does not establish a best win-rate pairing for the assembled team, especially at Battlefield 2/Fortified. Show the evidence type explicitly and avoid transferring a full-lineup result to substituted heroes or machines.

## Implementation decisions, in order

1. Add verified machine identities, alliances, ordinary and Mythic abilities, pinned recipes and per-level costs. Reuse stable IDs; do not classify arbitrary units outside the character catalog as machines.
2. Add role profiles with an explanation and stopping condition. Utility profiles should produce no spending action once satisfied. Store mechanical breakpoints separately from adjustable damage/survival goals.
3. Build machine readiness without character XP/rank gates. Return missing components, forge badges, ingredients, coins and unknown inventories explicitly. Never reuse `badgeCostBetween` or `abilityReadiness` unchanged.
4. Combine justified character and machine orb/badge demands before reserving shared balances. Selected Raid value wins priority; a hypothetical future Mythic benefit is not an immediately spendable action. Do not sum two independent planners that each reserve the same stock.
5. Include machines in Orb, Badge and Onslaught views, with low-investment roles and unselected alternatives collapsed. Connect Raid and saved War selections; Arena/Onslaught preferences need explicit user-selectable roles.
6. Enforce per-side War machine uniqueness and distinguish mechanics-based synergy from measured matchup results.
7. Verify numeric breakpoints, level-1 no-action states, missing stocks, shared-resource competition, faction restrictions, machine-ID coverage, primary/secondary recipe differences, Mythic beneficiaries and legal War assignments before publishing live recommendations.

## Community evidence and limitations

The following discussions supplied player experience, not verified global performance rankings. Exact mechanics above were independently checked; personal percentage-damage claims were not adopted as guaranteed outcomes.

- [New-player machine recommendations, May 2026](https://www.reddit.com/r/WH40KTacticus/comments/1ta5pg6/machine_of_war_recommendation_for_new_player/): low-investment Biovore/Forgefiend utility versus developed damage roles.
- [Machine investment discussion, July–September 2026](https://www.reddit.com/r/WH40KTacticus/comments/1uqekts/which_machine_of_war_is_in_your_opinion_worth/): conditional machine roles and Reanimator investment; anecdotes conflict and do not prove a universal order.
- [Raid-focused machine investment, June 2026](https://www.reddit.com/r/WH40KTacticus/comments/1ubt2n8/what_mow_should_i_level/): distinguish distraction from Raid investment; do not carry its old Cawl threshold forward unchanged.
- [Mythic machine priorities, May 2026](https://www.reddit.com/r/WH40KTacticus/comments/1tak0xx/mow_mythic_priority/): team-dependent Mythic decisions and Exorcist stopping-point discussion; older mechanical-team preferences predate Reanimator.
- [Storm Speeder users, April 2026](https://www.reddit.com/r/WH40KTacticus/comments/1s9rxh3/stormspeeder_mow/): ranged/Overwatch use and separate secondary investment.
- [September 2026 Raid update discussion](https://www.reddit.com/r/WH40KTacticus/comments/1w3qk9f/season_108_midseason_meta_check_riptide_is_a/): newer mechanical-team context; not evidence that every account should immediately replace Galatian.
- [September 2026 Cawl update](https://www.reddit.com/r/WH40KTacticus/comments/1wlm2us/infographic_guild_raid_guide_season_110_brings/): enemy-tier and star-dependent Forgefiend thresholds.
- [Earlier Cawl threshold disagreement, April 2026](https://www.reddit.com/r/WH40KTacticus/comments/1srnfqu/forgefiend_level_vs_m2_crawl/): damage range and rarity assumptions matter.
- [Current exact Raid lineups](https://terminusmaximus.com/guild-raid/boss-meta/): machine choices belong to the cited lineup and encounter, rather than establishing an account-wide upgrade order.

Direct wiki pages sometimes returned 403; indexed wiki excerpts were available. The assessment uses their explicit mechanics/rules, pinned upstream data and the dated discussions above, with conflicts retained rather than resolved by vote counts. No claim is made to have sampled all community feedback.
