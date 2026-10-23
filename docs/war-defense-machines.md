# Guild War defense machine recommendations

Reviewed October 23, 2026. These are ability-based planning judgments, not measured win-rate rankings for Battlefield 2 / Fortified Position. The imported core/flex export contains no machine-conditioned results. The current [Terminus defender analysis](https://www.terminusmaximus.com/guild-wars/defend/) uses complete teams with a recorded machine in BF4–5; those observations cannot be transferred to substituted teams in BF2. Machine popularity does not establish the best machine.

## Pairing policy

| Machine | Recommendation policy | Main limitation |
|---|---|---|
| Reanimator | Prioritize teams with multiple Mechanical allies. | Protocols must be applied before repair/revival/reactivation helps; overkill bypasses revival. |
| Rukkatrukk | Prioritize teams with at least two Orks. | Adjacent units are needed for the primary and Squig; weak damage is not solved by synergy. |
| Forgefiend | General fire control and anti-summon option; prefer teammates that cross fire freely. | Can obstruct other friendly ground units; primary kills depend on level and enemy stats. |
| Biovore | General board-pressure option where specialist support is less useful. | Human attackers need not chase mines. Level 1 distraction value is not guaranteed defense damage. |
| Malleus | Lower-priority general reinforcement option, with a small preference for healing teams that may last longer. | Guardsmen arrive after the initial cooldown and may die immediately. |
| Galatian | General reinforcement alternative, with a preference for mechanical support. | Stationary placement and primary durability matter; deployment ends its machine role. |
| Plagueburst Crawler | Suggest only when every teammate resists contamination. | Mixed Chaos is not automatically safe: non-Mechanical allies without Contagions of Nurgle lose armour too. |
| Z'Kar | Suggest for at least two Psykers. | Needs effective deployment adjacency, target reach and damage levels; AI execution is uncertain. |
| Storm Speeder | Suggest for multiple Overwatch units or Dark Angels. | AI chooses the Hailstrike recipient and timing; no guaranteed combo. |
| Tson'ji | Consider when Re'vas is present. | Marking happens after missile damage; no automatic first hit on a fresh target. |
| Exorcist | Remains available manually; no automatic fit in the reviewed profiles. | Requires a more specific ranged/fire plan than these assembled teams establish. |

The first legal allocation with all five reviewed archetypes and modest machine levels generally uses Reanimator for mechanicals, Rukkatrukk for the Ork hybrid, Forgefiend for fire-mobile Blood Angels, Biovore for Templars, and Malleus for the remaining mixed Chaos defense. Ownership, levels and manual pins can change that allocation. This is a starting hypothesis to review on the current map, not an upgrade mandate.

## Assignment and readiness

`warMachineRecommendations.ts` uses a small maximum-weight assignment over the owned machine registry. Specialist eligibility gates precede ordinal fit weights. A bounded readiness adjustment uses current primary/secondary levels, capped at the selected Gold/Silver ability ceiling; Galatian uses primary readiness because deployment ends the machine role. Levels on different abilities are not equal power. Stars, exact damage thresholds, map geometry and unknown enemy composition are not simulated. No Mythic benefit is assumed.

All five teams compete for the same machines. Existing manual selections remain pinned, even when they lack a reviewed synergy. Recommendations fill only unassigned teams; insufficient owned fits leave teams unassigned rather than repeating a machine or inventing compatibility. Team membership, core/flex statistics, deployment order, resource reservations and offense assignments are unchanged. Applying suggestions saves normal local machine selections; it does not spend resources.

## Mechanics references

- [Reanimator](https://tacticus.wiki.gg/wiki/Reanimator), [Rukkatrukk](https://tacticus.wiki.gg/wiki/Rukkatrukk), [Forgefiend](https://tacticus.wiki.gg/wiki/Forgefiend), [Biovore](https://tacticus.wiki.gg/wiki/Biovore).
- [Malleus](https://tacticus.wiki.gg/wiki/Malleus_Rocket_Launcher), [Galatian deployment](https://tacticus.wiki.gg/wiki/HDTW_DutyEternal), [hex effects](https://tacticus.wiki.gg/wiki/Hex_Effect).
- [Z'Kar](https://tacticus.wiki.gg/wiki/Z%27kar), [Storm Speeder](https://tacticus.wiki.gg/wiki/Storm_Speeder), [Tson'ji](https://tacticus.wiki.gg/wiki/Tson%27ji), [Exorcist](https://tacticus.wiki.gg/wiki/Exorcist).
- [Machine deployment rules](https://tacticus.wiki.gg/wiki/Machines_of_War): one machine per defense assignment, AI primary once per battle without munitions. This differs from a manually executed Raid rotation.

Community-maintained mechanics and uploaded battle logs are useful evidence, not proof of optimal AI play. Sources are linked in the UI next to each recommendation's rationale and caveat.
