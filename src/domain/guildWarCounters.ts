export type GuildWarCounterSource = {
    title: string;
    url: string;
    note?: string;
};

export type UnitCounter = {
    unitId: string;
    rationale: string;
    confidence: "high" | "medium" | "low";
    sourceIds: string[];
};

export type UnitCounterEntry = {
    defenderId: string;
    counters: UnitCounter[];
};

export type MechanicCounterCandidateGroup = {
    label: string;
    rationale: string;
    unitIds?: string[];
    candidateTrait?: string;
    guidanceOnly?: boolean;
    excludedDefenderTraits?: string[];
    sourceIds: string[];
};

export type MechanicCounterRule = {
    id: string;
    title: string;
    defenderTraits: string[];
    defenderIds?: string[];
    rationale: string;
    candidateGroups: MechanicCounterCandidateGroup[];
    sourceIds: string[];
};

export type GuildWarTeamMatchup = {
    defenseIds: string[];
    defenseTier: "gold" | "silver";
    offenseIds: string[];
    rationale: string;
    confidence: "high" | "medium" | "low";
    sourceIds: string[];
};

export type GuildWarAttackCoreEvidence = {
    name: string;
    unitIds: string[];
    wins: number;
    attempts: number;
    supported: boolean;
};

export type GuildWarDefenseCohort = {
    name: string;
    defenseIds: string[];
    minimumSharedDefenders: number;
    defenseAttempts: number;
    defenseFailures: number;
    mostCommonBattlefield: string;
    mostCommonBattlefieldShare: number;
    mostCommonMachine: string;
    attackCores: GuildWarAttackCoreEvidence[];
    sourceIds: string[];
};

export type GuildWarCounterKnowledge = {
    _meta: { reviewedOn: string; note: string };
    sources: Record<string, GuildWarCounterSource>;
    unitCounters: UnitCounterEntry[];
    mechanicNotes: Array<{ defenderId: string; note: string; confidence: "high" | "medium" | "low"; sourceId: string }>;
    mechanicRules: MechanicCounterRule[];
    teamMatchups: GuildWarTeamMatchup[];
    defenseCohorts: GuildWarDefenseCohort[];
};

export type CounterCharacter = { id: string; name: string; faction: string; icon: string; traits?: string[] };

export function validateGuildWarCounterKnowledge(
    characters: CounterCharacter[],
    knowledge: GuildWarCounterKnowledge
): void
{

    const characterIds = new Set(characters.map(character => character.id));
    const characterTraits = new Set(characters.flatMap(character => character.traits ?? []));
    const confidenceLevels = new Set(["high", "medium", "low"]);
    for (const [sourceId, source] of Object.entries(knowledge.sources))
    {

        let url: URL;
        try
        {

            url = new URL(source.url);

        }
        catch
        {

            throw new Error(`Guild War source ${sourceId} must use a valid HTTPS URL.`);

        }
        if (!source.title.trim() || url.protocol !== "https:") throw new Error(`Guild War source ${sourceId} must have a title and use HTTPS.`);

    }
    const assertSourceIds = (sourceIds: string[], label: string) =>
    {

        if (sourceIds.length === 0 || sourceIds.some(id => !knowledge.sources[id]))
        {

            throw new Error(`${label} must cite at least one known source.`);

        }

    };
    const assertConfidence = (confidence: string, label: string) =>
    {

        if (!confidenceLevels.has(confidence)) throw new Error(`${label} has an invalid confidence level.`);

    };

    const seenDefenders = new Set<string>();
    for (const entry of knowledge.unitCounters)
    {

        if (!characterIds.has(entry.defenderId)) throw new Error(`Unknown Guild War defender: ${entry.defenderId}`);
        if (seenDefenders.has(entry.defenderId)) throw new Error(`Duplicate Guild War counter list: ${entry.defenderId}`);
        seenDefenders.add(entry.defenderId);
        const seenCounters = new Set<string>();
        for (const counter of entry.counters)
        {

            if (!characterIds.has(counter.unitId)) throw new Error(`Unknown Guild War counter: ${counter.unitId}`);
            if (counter.unitId === entry.defenderId) throw new Error(`A unit cannot counter itself: ${counter.unitId}`);
            if (seenCounters.has(counter.unitId)) throw new Error(`Duplicate Guild War counter: ${counter.unitId}`);
            seenCounters.add(counter.unitId);
            if (!counter.rationale.trim()) throw new Error(`Missing counter rationale for ${counter.unitId}.`);
            assertConfidence(counter.confidence, `Counter ${counter.unitId}`);
            assertSourceIds(counter.sourceIds, `${entry.defenderId} counter ${counter.unitId}`);

        }

    }

    for (const entry of knowledge.mechanicNotes)
    {

        if (!characterIds.has(entry.defenderId)) throw new Error(`Unknown Guild War mechanic-note defender: ${entry.defenderId}`);
        if (!entry.note.trim() || !knowledge.sources[entry.sourceId]) throw new Error(`Guild War mechanic note for ${entry.defenderId} needs text and a known source.`);
        assertConfidence(entry.confidence, `Mechanic note ${entry.defenderId}`);

    }

    const seenMechanicRules = new Set<string>();
    for (const rule of knowledge.mechanicRules)
    {

        if (!rule.id.trim() || seenMechanicRules.has(rule.id)) throw new Error(`Guild War mechanic rule has a missing or duplicate ID: ${rule.id}`);
        seenMechanicRules.add(rule.id);
        if (!rule.title.trim() || !rule.rationale.trim() || (rule.defenderTraits.length === 0 && !rule.defenderIds?.length)) throw new Error(`Guild War mechanic rule ${rule.id} needs a title and defender trait or character.`);
        if (rule.defenderIds?.some(id => !characterIds.has(id))) throw new Error(`Guild War mechanic rule ${rule.id} references an unknown defender.`);
        if (rule.defenderTraits.some(trait => !characterTraits.has(trait))) throw new Error(`Guild War mechanic rule ${rule.id} references an unknown defender trait.`);
        assertSourceIds(rule.sourceIds, `Guild War mechanic rule ${rule.id}`);
        if (rule.candidateGroups.length === 0) throw new Error(`Guild War mechanic rule ${rule.id} needs at least one candidate group.`);
        for (const group of rule.candidateGroups)
        {

            if (!group.label.trim() || !group.rationale.trim() || (!group.unitIds?.length && !group.candidateTrait && !group.guidanceOnly)) throw new Error(`Guild War mechanic rule ${rule.id} has an incomplete candidate group.`);
            assertSourceIds(group.sourceIds, `Guild War mechanic rule ${rule.id} candidate group ${group.label}`);
            if (group.unitIds?.some(id => !characterIds.has(id))) throw new Error(`Guild War mechanic rule ${rule.id} references an unknown candidate.`);
            if (group.candidateTrait && !characterTraits.has(group.candidateTrait)) throw new Error(`Guild War mechanic rule ${rule.id} references an unknown candidate trait.`);
            if (group.excludedDefenderTraits?.some(trait => !characterTraits.has(trait))) throw new Error(`Guild War mechanic rule ${rule.id} references an unknown excluded defender trait.`);

        }

    }

    for (const matchup of knowledge.teamMatchups)
    {

        if (matchup.defenseIds.length !== 5 || matchup.offenseIds.length !== 5) throw new Error("Guild War team matchups must contain five defenders and five attackers.");
        if (new Set(matchup.defenseIds).size !== 5 || new Set(matchup.offenseIds).size !== 5) throw new Error("Guild War team matchups cannot repeat characters within a team.");
        if ([...matchup.defenseIds, ...matchup.offenseIds].some(id => !characterIds.has(id))) throw new Error("Guild War team matchup references an unknown character.");
        if (!matchup.rationale.trim()) throw new Error("Missing Guild War team matchup rationale.");
        assertConfidence(matchup.confidence, "Guild War team matchup");
        assertSourceIds(matchup.sourceIds, "Guild War team matchup");

    }

    for (const cohort of knowledge.defenseCohorts)
    {

        if (cohort.defenseIds.length !== 5 || new Set(cohort.defenseIds).size !== 5) throw new Error(`Defense cohort ${cohort.name} must contain five distinct defenders.`);
        if (cohort.defenseIds.some(id => !characterIds.has(id))) throw new Error(`Defense cohort ${cohort.name} references an unknown defender.`);
        if (!Number.isInteger(cohort.minimumSharedDefenders) || cohort.minimumSharedDefenders < 1 || cohort.minimumSharedDefenders > 5) throw new Error(`Defense cohort ${cohort.name} has an invalid overlap threshold.`);
        if (cohort.defenseAttempts <= 0 || cohort.defenseFailures < 0 || cohort.defenseFailures > cohort.defenseAttempts) throw new Error(`Defense cohort ${cohort.name} has invalid defense counts.`);
        if (!cohort.mostCommonBattlefield || !cohort.mostCommonMachine || cohort.mostCommonBattlefieldShare < 0 || cohort.mostCommonBattlefieldShare > 100) throw new Error(`Defense cohort ${cohort.name} is missing context.`);
        assertSourceIds(cohort.sourceIds, `Defense cohort ${cohort.name}`);
        for (const core of cohort.attackCores)
        {

            if (core.unitIds.length < 3 || core.unitIds.length > 5 || new Set(core.unitIds).size !== core.unitIds.length) throw new Error(`Attack core ${core.name} must contain three to five distinct units.`);
            if (core.unitIds.some(id => !characterIds.has(id))) throw new Error(`Attack core ${core.name} references an unknown character.`);
            if (!Number.isInteger(core.attempts) || core.attempts <= 0 || !Number.isInteger(core.wins) || core.wins < 0 || core.wins > core.attempts) throw new Error(`Attack core ${core.name} has invalid clear counts.`);

        }

    }

}

export type GuildWarMechanicCounterOptions = {
    rule: MechanicCounterRule;
    candidateGroups: Array<{
        group: MechanicCounterCandidateGroup;
        characters: CounterCharacter[];
    }>;
};

export function findGuildWarMechanicCounterOptions(
    defender: CounterCharacter,
    characters: CounterCharacter[],
    rules: MechanicCounterRule[]
): GuildWarMechanicCounterOptions[]
{

    const defenderTraits = defender.traits ?? [];
    return rules.flatMap(rule =>
    {

        if (!rule.defenderTraits.some(trait => defenderTraits.includes(trait)) && !rule.defenderIds?.includes(defender.id)) return [];
        const candidateGroups = rule.candidateGroups.flatMap(group =>
        {

            if (group.excludedDefenderTraits?.some(trait => defenderTraits.includes(trait))) return [];
            const ids = new Set(group.unitIds ?? []);
            const candidates = characters.filter(character =>
                ids.has(character.id) || (group.candidateTrait && character.traits?.includes(group.candidateTrait))
            ).sort((a, b) => a.name.localeCompare(b.name));
            return candidates.length || group.guidanceOnly ? [{ group, characters: candidates }] : [];

        });
        return candidateGroups.length ? [{ rule, candidateGroups }] : [];

    });

}

export function findGuildWarTeamMatchups(
    defenseIds: string[],
    defenseTier: "gold" | "silver",
    matchups: GuildWarTeamMatchup[]
): GuildWarTeamMatchup[]
{

    if (defenseIds.length !== 5 || new Set(defenseIds).size !== 5) return [];
    const selected = [...defenseIds].sort();
    return matchups.filter(matchup =>
        matchup.defenseTier === defenseTier
        && matchup.defenseIds.length === 5
        && [...matchup.defenseIds].sort().every((id, index) => id === selected[index])
    );

}

export function findGuildWarDefenseCohorts(defenseIds: string[], cohorts: GuildWarDefenseCohort[])
{

    if (defenseIds.length !== 5 || new Set(defenseIds).size !== 5) return [];
    const selected = new Set(defenseIds);
    return cohorts.flatMap(cohort =>
    {

        const sharedDefenders = cohort.defenseIds.filter(id => selected.has(id));
        return sharedDefenders.length >= cohort.minimumSharedDefenders
            ? [{ cohort, sharedCount: sharedDefenders.length, sharedDefenders }]
            : [];

    }).sort((a, b) => b.sharedCount - a.sharedCount || b.cohort.defenseAttempts - a.cohort.defenseAttempts);

}
