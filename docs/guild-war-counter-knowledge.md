# Guild War offense counter knowledge

The curated dataset lives in `config/guild_war_counters.json` and is shown on `/war-defense/counters`. The page lets users enter any subset of the five opposing defenders, browse all roster characters, inspect applicable trait mechanics, and search exact five-character Guild War matchups and documented defense cohorts.

Each recommendation must include:

- Stable character IDs from `data/character_catalog.json`.
- A concise rationale describing why the matchup works.
- A confidence label; do not state a theoretical synergy as a proven win rate.
- At least one source ID linking to a community or game-mechanics source.

An unlisted counter means research is incomplete, not that the unit has no counter. Exact-team records must represent the same five defenders and tier. Do not infer exact-team success from general offensive lineup rates or defense usage statistics.

`mechanicNotes` are intentionally separate from counters. They describe a sourced ability threat or tactical caution; they do not imply that a specific attacking unit or team has been tested successfully. The Angrax/Maladus/Kharn/Rotbone/Typhus example has mechanics notes, but no verified individual counter-unit or exact-team recommendation.

`mechanicRules` match a defender's cataloged traits to specific, sourced game-mechanics interactions and list attackers with the relevant damage types, traits, or abilities. They are tactical leads, not measured Guild War results. The interface labels these matches explicitly and keeps them separate from exact matchups and cohort win rates. For example, Psychic and Direct hits bypass Terminator Armour's first-Attack damage reduction; that interaction alone does not establish that a listed character wins against a particular defender. Ability-use limits, remaining health, positioning, rarity caps, and other team members still matter.

Mechanic rules should be added only when both sides of the interaction are verified. Prefer exact ability/damage information over broad assumptions from a character's faction or trait. If an effect is conditional, document the condition (for example, suppressive fire does not affect Terminator Armour). Where the catalog has no applicable rule, show a research gap rather than inventing counters.

`defenseCohorts` stores aggregate attack-core results against defense groups with a documented minimum number of shared defenders. These may be useful for similar compositions, but are not exact-team matchup rates or isolated unit counters. Preserve the source's supported-sample flag and its tier/map/season limitations when presenting the statistics. The current Terminus Maximus records cover three common Chaos defenses and report attack cores against defenses sharing at least three of five characters.

## First evidence pass: Angrax / Maladus / Khârn / Rotbone / Typhus

The example shares three defenders (Maladus, Rotbone, Typhus) with the source's Death Guard cohort: Maladus, Rotbone, Corrodius, Typhus, and Toth. The source groups attacks against defenses sharing at least three of those five defenders, with any Machine of War. It does not isolate this exact defense, its Gold tier, or an individual defender.

The cohort's highest-clear attack cores include:

- **Genestealer Cults** (Judh, Isaak, Hollan, The Patermine, Xybia): 138/153 clears (90.2%).
- **Blood Angels** (Mephiston, Lucien, Mataneo, Nicodemus, Dante): 502/583 clears (86.1%).
- **Abraxas / Yazaghor / Ahriman / Archimatos**: 279/319 clears (87.5%).

These are observed team-core results for the overlapping cohort, not predictions or exact-match win rates for the example. The report covers Guild War Seasons 25–27 and Battlefield tiers 4–5; its data was captured through October 6, 2026, and the report was updated October 19, 2026. It includes 162 recorded wars overall. Rates are not adjusted for tier, map, power, opponent choice, or repeated wars. Sources: [defense and cohort counters](https://terminusmaximus.com/guild-wars/defend/) and [attack-team cores](https://terminusmaximus.com/guild-wars/attack/).

The review found no source-verified individual counter-unit pairing or exact five-versus-five result for the five example defenders. The character view therefore remains a research-gap list; do not infer that one member of a successful attack core counters one defender.

When contributing research, prefer current Guild War reports with opponent composition and outcomes, or well-described gameplay demonstrations. Preserve map, slot, rank, machine, season, and rarity conditions when a source makes them relevant. Re-check older sources after substantial balance changes.

## Expanding the unit-by-unit mechanics matrix

The current sourced rule set is intentionally broader than exact Guild War results. It includes Terminator Armour, Overwatch, Resilient, Rotbone's revive, Mechanical units, Flying units, Big Targets, Psykers, Mk X Gravis, Parry, Camouflage, Explodes, Vehicles, Final Vengeance, Living Metal, Healers, Shadow in the Warp, Ambush, Blessings of Khorne, Thrill Seekers, Get Stuck In, Mechanic, Terrifying, Act of Faith, Prioritised Efficiency, Indirect Fire, Heavy Weapon, Unstoppable, Infiltrate, Synapse, Crushing Strike, and specific ability interactions for Castellan Creed and Aun'Shi.

Examples of character-specific recommendations include:

- **Terminator Armour:** Psychic basic attacks, Psychic-damage abilities, and Direct-damage abilities bypass its first-Attack reduction. Sy-Gex and Vynn also have abilities specifically concerning Terminator Armour, but Vynn's Physical damage does not bypass that reduction.
- **Overwatch:** Infiltrate avoids Overwatch targeting; Suppressive Fire can stop Overwatch while Suppression lasts, except against Terminator Armour.
- **Resilient / Final Vengeance:** Overkill can prevent Resilient's 1-Health protection and Final Vengeance. Maladus's Flail Swing and Pestillian's Blight Racks have conditional Always-Overkill interactions; use only when their actual ability conditions are met.
- **Rotbone:** Maladus's Flail Swing active Always Overkills defeated targets, which prevents Rotbone's revive, including the "even if Overkilled" case.
- **Psykers:** Atlacoya, Helbrecht, Roswitha, and Tjark have documented anti-Psyker interactions. Their effects differ (damage, Direct damage, movement, or Psychic mitigation) and have range/positioning conditions.
- **Flying / Big Target:** Njal can Stun Flying enemies damaged by his active; Tanksmasha can Stun a Big Target hit by his charge. Beast Slayer characters also gain bonus melee damage against Big Targets and Vehicles.
- **Mk X Gravis:** Psychic/Direct damage bypasses Armour, Sy-Gex/Vynn have trait-specific interactions, and Critical hits avoid the second Armour application.
- **Vehicles:** Melta attacks gain bonus damage and Beast Slayer grants bonus melee damage. Sy-Gex being a Vehicle also makes it Mechanical; the two rules are separate.
- **Camouflage / Parry / Explodes / Living Metal / Healer:** The page provides mechanics-specific tactical guidance, such as selecting a less-affected attack mode, separating allies before an explosive defeat, or accounting for regeneration/healing. Generic tactics are not mislabeled as character-specific counters.
- **Ambush / Blessings of Khorne / Get Stuck In / Act of Faith:** The guide calls out Decoy-based returns, melee-kill stack limits, positioning that raises Ork bonus-hit odds, and increasing crit pressure.
- **Creed / Aun'Shi:** The guide notes Kell's attack interception and Creed's Guardsmen activations, plus Aun'Shi's round-based buffs and repeat-Active support.

Every character in the current 112-character catalog now matches at least one applicable trait or character-specific rule. This is coverage of researched game mechanics—not 112 tested counters, not a ranked list of best attackers, and not proof that any recommendation wins a Guild War battle. The UI calculates coverage from the catalog and rules; characters with a rule but no named attacker receive clearly labeled tactical guidance. Continue expanding with verified character ability interactions and current, attributable Guild War match data, not a forced one-counter-per-character quota.
