import { campaignKey } from "./campaigns";
import { farmNodesFor, isEliteNode, type CampaignBattle, type FarmNode, type Progress } from "./farmingSources";
import type { Recipe } from "./farming";
import type { MaterialCompletionRow, MaterialRecipient } from "./materialCompletion";

export type EliteGap = {
    id: string; name: string; rarity: string; coverage: "locked" | "unknown" | "no-elite";
    eliteNodes: FarmNode[]; alternative: FarmNode | null;
    inventory: number | null; remaining: number | null; shortage: number | null;
    status: MaterialCompletionRow["status"] | "unknown"; characters: MaterialRecipient[];
};
export type UnlockMaterial = { id: string; name: string; shortage: number; node: FarmNode; estimatedSavings: number | null };
export type EliteOpportunity = {
    campaign: string; frontier: number; nextNode: number; targetNode: number;
    materials: UnlockMaterial[]; estimatedSavings: number; comparedMaterials: number;
};

export function eliteFarmingGaps({ recipes, battles, progress, completion }: {
    recipes: Record<string, Recipe>; battles: Record<string, CampaignBattle>;
    progress: Progress; completion?: MaterialCompletionRow[];
}): EliteGap[] {
    const demand = new Map(completion?.map(row => [row.id, row]));
    const rows: EliteGap[] = [];
    for (const [id, recipe] of Object.entries(recipes)) {
        const nodes = farmNodesFor(id, battles, progress);
        if (!nodes.length) continue; // Only farmable upgrade materials; no shards/currency/recipe-only items.
        const eliteNodes = nodes.filter(isEliteNode);
        if (eliteNodes.some(node => node.access === "unlocked")) continue;
        const row = demand.get(id);
        rows.push({ id, name: recipe.material, rarity: recipe.rarity,
            coverage: eliteNodes.length === 0 ? "no-elite" : eliteNodes.some(node => node.access === "unknown") ? "unknown" : "locked",
            eliteNodes: [...eliteNodes].sort((a, b) => a.nodeNumber - b.nodeNumber || a.id.localeCompare(b.id)),
            alternative: nodes.find(node => node.access === "unlocked" && !isEliteNode(node)) ?? null,
            inventory: row?.inventory ?? null, remaining: row?.remaining ?? null, shortage: row?.shortage ?? null,
            status: row?.status ?? "unknown", characters: row?.recipients.filter(recipient => recipient.owned && recipient.remaining > 0) ?? [] });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function filterEliteGaps(rows: EliteGap[], options: { includeMythic: boolean; onlyNeeded: boolean }): EliteGap[] {
    return rows.filter(row => (options.includeMythic || row.rarity !== "Mythic") &&
        (!options.onlyNeeded || row.shortage === null || row.shortage > 0));
}

/** Each campaign alternative gets a material once, at its earliest locked node.
 * Savings compare expected energy per drop; they exclude campaign-clear cost and
 * daily attempt limits. Alternative campaigns' benefits must not be added together.
 */
export function eliteUnlockOpportunities(rows: EliteGap[], progress: Progress): EliteOpportunity[] {
    const campaigns = new Map<string, Map<string, UnlockMaterial>>();
    for (const row of rows) {
        if (row.coverage !== "locked" || row.shortage === null || row.shortage <= 0) continue;
        for (const node of row.eliteNodes) {
            if (node.access !== "locked") continue;
            const key = campaignKey(node.campaign, node.campaignType);
            const materials = campaigns.get(key) ?? new Map<string, UnlockMaterial>();
            const previous = materials.get(row.id);
            if (previous && previous.node.nodeNumber < node.nodeNumber) continue;
            if (previous && previous.node.nodeNumber === node.nodeNumber && previous.node.energyCost / previous.node.rate <= node.energyCost / node.rate) continue;
            materials.set(row.id, { id: row.id, name: row.name, shortage: row.shortage, node,
                estimatedSavings: row.alternative ? Math.max(0, row.shortage * (row.alternative.energyCost / row.alternative.rate - node.energyCost / node.rate)) : null });
            campaigns.set(key, materials);
        }
    }
    return [...campaigns].map(([campaign, entries]) => {
        const materials = [...entries.values()].sort((a, b) => a.node.nodeNumber - b.node.nodeNumber || a.name.localeCompare(b.name));
        return { campaign, frontier: progress[campaign]!, nextNode: materials[0]!.node.nodeNumber,
            targetNode: Math.max(...materials.map(material => material.node.nodeNumber)), materials,
            estimatedSavings: materials.reduce((sum, material) => sum + (material.estimatedSavings ?? 0), 0),
            comparedMaterials: materials.filter(material => material.estimatedSavings !== null).length };
    }).sort((a, b) => b.estimatedSavings - a.estimatedSavings || b.materials.length - a.materials.length || a.campaign.localeCompare(b.campaign));
}
