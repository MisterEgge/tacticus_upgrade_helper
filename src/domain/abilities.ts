import type { CatalogCharacter, CharacterAbilityGuidance } from "../../app/lib/catalog";
import type { RosterUnit } from "../../app/lib/report";

export function formatAbilityName(value:string)
{

    return value.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();

}

export function targetLevel(value:string, fallback=35)
{

    return Number(value.match(/\d+/)?.[0] ?? fallback);

}

export function abilityGuideRows(catalog: CatalogCharacter[], roster: RosterUnit[] | null, guidance: Record<string, unknown>, priorities: Record<string, { priority: number }>)
{

    const owned = new Map(roster?.map(u => [u.id, u]) ?? []);
    return catalog.map(character =>
    {

        const unit = owned.get(character.id);
        const candidate = guidance[character.name] as Partial<CharacterAbilityGuidance> | undefined;
        const reviewed = !!candidate?.active?.practical && !!candidate?.passive?.practical && !!candidate?.confidence && !["unreviewed", "researching", "baseline-only"].includes(candidate.confidence.toLowerCase());
        const g = reviewed ? candidate as CharacterAbilityGuidance : undefined;
        const activeLevel = unit?.abilities[0]?.level ?? null;
        const passiveLevel = unit?.abilities[1]?.level ?? null;
        return {
            id: character.id, icon: character.icon, character: character.name, faction: character.faction,
            owned: roster === null ? null : !!unit,
            activeId: character.activeAbilityId ?? unit?.abilities[0]?.id ?? "Unknown ability",
            passiveId: character.passiveAbilityIds ?? unit?.abilities[1]?.id ?? "Unknown ability",
            activeLevel, passiveLevel,
            activeTargetLevel: targetLevel(g?.active.practical ?? "", 35),
            passiveTargetLevel: targetLevel(g?.passive.practical ?? "", 35),
            activeTo17: activeLevel !== null && activeLevel > 0 && activeLevel < 17,
            passiveTo17: passiveLevel !== null && passiveLevel > 0 && passiveLevel < 17,
            accountPriority: priorities[character.name]?.priority ?? 0,
            focus: g?.active.priority ?? "General baseline",
            basis: g?.active.note ?? "Use level 17 as the account baseline. Level 35 is the usual general stop; 44–50 is reserved for a deliberate high-investment build.",
            communityActiveTarget: g?.active.practical ?? "17 baseline · 35 general stop",
            communityPassiveTarget: g?.passive.practical ?? "17 baseline · 35 general stop",
            targetConfidence: g?.confidence ?? "general planning baseline — character research pending",
            activeHigh: g?.active.high ?? "44–50 high investment", passiveHigh: g?.passive.high ?? "44–50 high investment",
            reviewed
        };

    });

}

export type AbilityGuideRow = ReturnType<typeof abilityGuideRows>[number];
