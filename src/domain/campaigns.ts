export type CampaignType = "Standard" | "Mirror" | "Elite" | "EliteMirror";
export type Campaign = {
    id: string;
    name: string;
    type: CampaignType;
    battles?: Array<{ battleIndex: number }>;
};

// API names omit variants; the synced battle catalog includes them in the name.
export function campaignKey(name: string, type: string): string
{

    const mirror = /mirror/i.test(type) || /\bmirror\b/i.test(name);
    const elite = /elite/i.test(type) || /\belite\b/i.test(name);
    const base = name.replace(/(?:\s+(?:Elite|Mirror))+$/i, "").trim();
    return `${base}${mirror ? " Mirror" : ""}${elite ? " Elite" : ""}`;

}

export function requiredCampaignName(campaign: Pick<Campaign, "name" | "type">): string
{

    return campaignKey(campaign.name, campaign.type).replace(/ Elite$/, "");

}

export function campaignProgress(campaign: Campaign)
{

    const indices = campaign.battles?.map(b => b.battleIndex);
    // Missing/malformed data is unknown, not zero progress. The API schema allows
    // a terminal sentinel (index 75); it proves battle 75, not an actual battle 76.
    if (!indices || indices.some(i => !Number.isInteger(i) || i < 0 || i > 75))
    {

        return { highestUnlockedBattle: null, highestCompletedBattle: null, highestConfirmedThreeStarBattle: null };

    }
    const highestUnlockedBattle = indices.reduce((max, i) => Math.max(max, i + 1), 0);
    return {
        highestUnlockedBattle,
        highestCompletedBattle: Math.max(0, highestUnlockedBattle - 1),
        // The checked-in official API schema exposes attempts, not stars/medals.
        highestConfirmedThreeStarBattle: null
    };

}

export type SnapshotUnit = {
    id: string;
    rank?: number;
    progressionIndex?: number;
    abilities?: Array<{ id: string; level: number }>;
};
export type CampaignCharacter = { id: string; name: string; campaignsRequiredIn: string[] };
export type SnapshotPlayer = {
    metaData?: { lastUpdatedOn?: number };
    player: { units: SnapshotUnit[]; progress?: { campaigns?: Campaign[] } };
};

export function buildCampaignSnapshot(player: SnapshotPlayer, characters: CampaignCharacter[], capturedAt: string)
{

    const units = new Map(player.player.units.map(u => [u.id, u]));
    const campaigns = Object.fromEntries((player.player.progress?.campaigns ?? [])
        .filter(c => c.type === "Elite" || c.type === "EliteMirror")
        .map(c => [c.id, {
            id: c.id,
            name: requiredCampaignName(c),
            type: c.type,
            ...campaignProgress(c),
            requiredCharacters: characters.filter(ch => ch.campaignsRequiredIn.includes(requiredCampaignName(c))).map(ch =>
            {

                const u = units.get(ch.id);
                return {
                    name: ch.name, id: ch.id,
                    rank: u?.rank ?? null,
                    progressionIndex: u?.progressionIndex ?? null,
                    activeLevel: u?.abilities?.[0]?.level ?? null,
                    passiveLevel: u?.abilities?.[1]?.level ?? null
                };

            })
        }]));
    return {
        schemaVersion: 2 as const,
        capturedAt,
        apiLastUpdatedOn: player.metaData?.lastUpdatedOn ?? null,
        campaigns
    };

}

export type CampaignSnapshot = ReturnType<typeof buildCampaignSnapshot>;

// Compare against ALL observations, so partial/stale responses cannot reset the
// milestone baseline and create duplicate clear events when progress reappears.
export function advancedCampaigns(current: CampaignSnapshot, history: CampaignSnapshot[]): string[]
{

    return Object.entries(current.campaigns).filter(([id, c]) =>
    {

        if (c.highestCompletedBattle === null || c.highestCompletedBattle === 0) return false;
        const prior = history.flatMap(s =>
        {

            const value = s.campaigns[id]?.highestCompletedBattle;
            return typeof value === "number" ? [value] : [];

        });
        // First observation is a baseline, never evidence of a recent advance.
        return prior.length > 0 && c.highestCompletedBattle > Math.max(...prior);

    }).map(([id]) => id);

}
