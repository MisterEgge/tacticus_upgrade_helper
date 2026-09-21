import type { CatalogCharacter, CharacterAbilityGuidance } from "../../app/lib/catalog";
import type { RosterUnit } from "../../app/lib/report";

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
            activeTo17: activeLevel !== null && activeLevel > 0 && activeLevel < 17,
            passiveTo17: passiveLevel !== null && passiveLevel > 0 && passiveLevel < 17,
            accountPriority: priorities[character.name]?.priority ?? 0,
            focus: g?.active.priority ?? "Unreviewed",
            basis: g?.active.note ?? "Community breakpoint research pending.",
            communityActiveTarget: g?.active.practical ?? "UNREVIEWED",
            communityPassiveTarget: g?.passive.practical ?? "UNREVIEWED",
            targetConfidence: g?.confidence ?? "unreviewed",
            activeHigh: g?.active.high ?? "", passiveHigh: g?.passive.high ?? "",
            reviewed
        };

    });

}

export type AbilityGuideRow = ReturnType<typeof abilityGuideRows>[number];
