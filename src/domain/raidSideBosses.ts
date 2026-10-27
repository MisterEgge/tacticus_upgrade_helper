export type RaidSideBoss = {
    name: string; portraitId?: string; page: string; approach: string; tips: string[]; benefit: string;
};
type SupportingBattles = { excludedFaction: string; bosses: RaidSideBoss[] };
export const SIDE_BOSSES_REVIEWED = "2026-10-27";
export const SIDE_BOSS_MAPS = "https://tacticus.wiki.gg/wiki/Guild_Raid_Maps";
export const sideBossSource = (page: string) => `https://tacticus.wiki.gg/wiki/${encodeURIComponent(page)}`;
const guide = (name: string, portraitId: string | undefined, page: string, approach: string, tips: string[], benefit: string): RaidSideBoss =>
    ({name, ...(portraitId ? {portraitId} : {}), page, approach, tips, benefit});
const primeTips = [
    "Save the big damage abilities for a round without Reinforced Hive Node: it doubles armour on alternating rounds, starting with the first round in play.",
    "Occupy marked Ripper emergence hexes when safe to prevent spawns. Spread melee units so Scything Talons cannot splash several allies; summons take extra hits."
];
// Encounters are keyed by parent boss: identically named Primes can have different support effects.
const guides: Record<string, SupportingBattles> = {
    "Avatar of Khaine": {excludedFaction:"Aeldari",bosses:[
        guide("Aethana","eldarAutarch","AethanaGR","Attack repeatedly, then move off marked hexes.",[
            "The Wild Host causes health loss each time she is attacked despite her damage reduction. Favour repeated attacks over one large hit.",
            "Check marked hexes before ending your turn. Avoid lining three units up for Swooping Hawk; nearby enemies benefit from her damage and crit aura."
        ],"Weakens Guardians and lowers Avatar's damage."),
        guide("Eldryon","eldarFarseer","EldryonGR","Step onto the Phantasm before committing damage.",[
            "A Phantasm reduces incoming damage. Move a unit onto it to remove it and make Eldryon lose health; keep mobile units available after he teleports.",
            "Avoid ending exactly two hexes from him where his allies' attacks gain Doom damage. His Executioner grows stronger as rounds pass."
        ],"Lowers Avatar's armour and Molten Form reduction; removes a Warlock.")
    ]},
    "Belisarius Cawl": {excludedFaction:"Adeptus Mechanicus",bosses:[
        guide("Tan Gi'da","admecMarshall","Tan_Gi'daGR","Keep a route through the Vanguard waves.",[
            "Avoid contaminated hexes where possible: Rad-Zone Corps damages enemies whose armour is reduced, and another row becomes contaminated each turn.",
            "Watch Conqueror Imperative: adjacent Mechanical summons can attack again after Tan Gi'da attacks. Clear blockers without letting the endless waves consume every attack."
        ],"Weakens Cawl's Enginseers and armour; later delays Self-Repair."),
        guide("Actus","admecManipulus","ActusGR","Destroy Archeotec Crates before Actus consumes them.",[
            "Crates give Actus damage reduction; destroying one also removes health. Ending beside a crate lets him consume it and strengthen his Mechanical allies.",
            "Check Sy-Gex's Overwatch lanes before moving. Actus can repair adjacent allies and trigger their attacks, including repairs at full health."
        ],"Removes Electro-Priests, lowers Arc Scourge and block chance; later delays Self-Repair.")
    ]},
    "Ghazghkull": {excludedFaction:"Orks",bosses:[
        guide("Gibbascrapz","orksBigMek","GibbascrapzGR","Keep separate damage events landing on Gibbascrapz.",[
            "Boss Adjutant adds health loss when he takes damage, up to 15 times per turn. More hits in a single attack should not be treated as 15 separate triggers.",
            "His Grot Tank shoots immediately when summoned. Clear it when it threatens survival or blocks access; avoid spending the whole turn away from Gibbascrapz."
        ],"Lowers Ghazghkull's armour and Dakka hits; raises the attack allowance before Prophet damage reduction."),
        guide("Tanksmasha","orksNob","TanksmashaGR","Detonate oil drums with your units clear.",[
            "Destroying a drum removes Tanksmasha's health, but the explosion damages adjacent characters and destroys affected summons.",
            "Avoid his straight charge lane. Moving at least two hexes strengthens his damage and defence; check his reach rather than clustering around the drums."
        ],"Reduces Ghazghkull's Boyz, damage and Proper Killy hits.")
    ]},
    "Hive Tyrant": {excludedFaction:"Tyranids",bosses:[
        guide("Alpha Prime",undefined,"TyrantAlphaGR","Burst between the reinforced rounds.",primeTips,"Lowers Hive Tyrant's damage, Stranglethorn Cannon and Ripper stats; eventually lowers movement."),
        guide("Omega Prime",undefined,"TyrantOmegaGR","Burst between the reinforced rounds.",primeTips,"Lowers Hive Tyrant's armour, Pincer Tail damage and Ripper stats; eventually lowers movement.")
    ]},
    "Magnus": {excludedFaction:"Thousand Sons",bosses:[
        guide("Thaumachus","thousSorcerer","ThaumachusGR","Defeat the copies before bursting Thaumachus.",[
            "Each copied character's first defeat removes his health. Any surviving copy maintains his damage reduction; copies inherit your characters' stats and abilities.",
            "Avoid surrounding your strongest attacker with fragile allies: possession makes it and its summons attack your team. Watch where Arcane Shield lands."
        ],"Weakens Magnus's copies and Gaze; removes supporting enemies."),
        guide("Abraxas","thousInfernalMaster","AbraxasGR","Clear Daemons to damage Abraxas and remove protection.",[
            "Each friendly Daemon defeated removes Abraxas's health. While any survive, his incoming damage is reduced; bring reliable wave clearing.",
            "Expect the one-time nine-Screamer wave when no allied Daemons remain at the end of his turn. Avoid lines that let their flying attacks hit several allies."
        ],"Lowers Magnus's Blade and Gaze damage; removes supporting enemies.")
    ]},
    "Mortarion": {excludedFaction:"Death Guard",bosses:[
        guide("Nauseous Rotbone","deathRotbone","Nauseous_RotboneGR","Land repeated damage on Rotbone before his next heal.",[
            "Boss Adjutant adds health loss to damage events, up to 15 times per turn. Plan multiple attacks rather than relying on one large strike.",
            "Adjacent Chaos allies can resurrect and benefit from his group heal. Focus Rotbone when reachable; avoid wasting a burst on a nearby ally that can return."
        ],"Reduces Arch-Contaminator hits, armour and attack damage; delays Revoltingly Resilient's hit reduction."),
        guide("Corrodius","deathBlightbringer","CorrodiusGR","Kill the Poxwalkers to hurt Corrodius.",[
            "Every friendly unit defeated damages Corrodius for 77% of that unit's maximum health. Use area attacks on the fresh waves instead of chasing only him.",
            "Keep Psykers outside his Contagion aura where possible: Psychic attacks there damage the attacker. Prevent Poxwalkers from killing non-Mechanical units and multiplying."
        ],"Reduces Host of Plagues, armour and movement; delays Revoltingly Resilient's hit reduction.")
    ]},
    "Riptide": {excludedFaction:"Tau Empire",bosses:[
        guide("Sho'syl","tauMarksman","Sho'sylGR","Reach melee early; delay mass summons.",[
            "Melee damage triggers extra health loss despite his damage reduction. Remove nearby drones when their protection blocks your damage.",
            "At the start of his third turn, each enemy unit adds another Stealth Battlesuit to his wave. Avoid flooding the board with your summons before that trigger."
        ],"Lowers Target Lock damage, removes a Shield Drone and reduces Nova Charge coverage and movement."),
        guide("Re'vas","tauCrisis","Re'vasGR","Use Infiltrate or Terminator Armour attackers.",[
            "Attacks by either trait trigger extra health loss. Infiltrate also helps with the Overwatch approach; check the actual firing lanes before moving others.",
            "Her active can be used three times, so Overwatch can return. Clear Shield Drones when they intercept attacks, and remember Mechanical attackers take stronger Particle hits."
        ],"Lowers Riptide's armour and block chance, removes a Shield Drone and reduces Nova Charge coverage.")
    ]},
    "Rogal Dorn": {excludedFaction:"Astra Militarum",bosses:[
        guide("Sibyll Devine","astraPrimarisPsy","Sibyll_DevineGR","Clear the Guardsmen waves to remove Sibyll's health.",[
            "Six Guardsmen arrive at the top each turn and act immediately. Bring area damage and keep a safe route to the spawn lanes.",
            "Each Guardsman's defeat now causes health loss, not Psychic damage. Nightshroud protects units starting adjacent to her and gives them Infiltrate; do not rely solely on Overwatch."
        ],"Improves rear-armour crit chance, lowers Dorn's armour and removes Guardsmen."),
        guide("Thaddeus Noble","astraOrdnance","Thaddeus_NobleGR","Reach melee or use a stun-capable attack.",[
            "A melee attack or an effect that would stun triggers extra health loss. The first such trigger each round also suppresses his Emplacement units, even though he is Immune.",
            "Check Lascannon Overwatch before closing. Spread out against Barrage and Mortar splash; distant units take stronger Emplacement fire."
        ],"Lowers Dorn's damage and the crits needed to stop Gunners; removes a Mortar Team.")
    ]},
    "Screamer-Killer": {excludedFaction:"Tyranids",bosses:[
        guide("Neurothrope","tyranNeurothrope","NeurothropeGR","Bring melee damage to trigger extra health loss.",[
            "Non-melee attacks are reduced. Prefer safe repeat melee damage over a ranged boss lineup that cannot trigger the vulnerability.",
            "Heal Neuroparasite targets to clear the infection. Keep fragile units away from Psychic and suppression chains that build it; Spirit Leech also heals nearby Tyranids."
        ],"Removes Barbagaunts, lowers damage and crit damage, and removes Death Scream's stun."),
        guide("Winged Prime","tyranWingedPrime","WingedPrimeGR","Bring Flame or Blast damage.",[
            "Both damage types trigger extra health loss; other attacks are reduced. Check your chosen attack's damage type, rather than assuming any ranged attack qualifies.",
            "Keep access through the Hormagaunts and summoned Warrior. Prepare for Final Vengeance when finishing the Prime; avoid leaving a fragile unit as the nearby target."
        ],"Removes Hormagaunts, lowers armour and crit damage, and removes Living Battering Ram's stun.")
    ]},
    "Szarekh": {excludedFaction:"Necrons",bosses:[
        guide("Menhir & Hapthatra",undefined,"HapthatraGR","Overkill the supporting Necrons to damage the Menhir.",[
            "Integrated Circuits copies damage from friendly units being Overkilled onto the Menhir as Direct damage. Overkills also prevent the troops' Reanimation Protocols.",
            "Move off the four marked beam hexes. Spread around Hapthatra's splash target, especially summons, which take double damage from Staff of Stars."
        ],"Lowers Szarekh's armour, Hapthatra's health, attack hits and beam targets."),
        guide("Menhir & Mesophet",undefined,"MesophetGR","Overkill the supporting Necrons to damage the Menhir.",[
            "Integrated Circuits transfers the damage from friendly Overkills to the Menhir. Reserve sufficiently strong attacks for those kills.",
            "Leave marked beam hexes before the next enemy turn. Avoid surrounding Mesophet: his scythe hits every adjacent enemy, and his aura strengthens nearby Necron melee."
        ],"Lowers Szarekh's damage, Mesophet's health, attack hits and beam targets.")
    ]},
    "Tervigon": {excludedFaction:"Tyranids",bosses:[
        guide("Alpha Prime",undefined,"TervigonAlphaGR","Burst between the reinforced rounds.",primeTips,"Lowers Tervigon's damage and Scything Talons splash; eventually lowers movement."),
        guide("Omega Prime",undefined,"TervigonOmegaGR","Target this support fight when armour or Termagants block progress.",[
            "Its support thresholds lower Tervigon's armour and Termagant stats. Coordinate the next threshold with your guild before spending a token.",
            "Encounter-specific ability notes still need verification. Inspect the Prime's abilities in the battle preview before choosing your team or burst turn."
        ],"Lowers Tervigon's armour and Termagant stats; eventually lowers movement.")
    ]}
};
export function raidSideBosses(boss: string): SupportingBattles | null { return guides[boss] ?? null; }
