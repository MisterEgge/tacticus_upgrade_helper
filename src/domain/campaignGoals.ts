export type CampaignGoalCandidate = { id: string; name: string; currentRank: number; targetRank: number; upgrades?: number[]; priority: number; confidence?: string };

export function collapseCampaignGoals(candidates: CampaignGoalCandidate[])
{

    const byCharacter = new Map<string, CampaignGoalCandidate>();
    for (const candidate of candidates)
    {

        if (candidate.confidence === "low") continue;
        const existing = byCharacter.get(candidate.id);
        if (!existing || candidate.targetRank > existing.targetRank || (candidate.targetRank === existing.targetRank && candidate.priority > existing.priority))
            byCharacter.set(candidate.id, candidate);

    }
    return [...byCharacter.values()].map(({ confidence: _confidence, ...goal }) => goal);

}
