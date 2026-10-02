import { campaignKey } from "./campaigns";

export type CampaignBattle = {
    campaign: string; campaignType: string; nodeNumber: number; energyCost: number;
    rewards?: { potential?: Array<{ id: string; effective_rate?: number }>; guaranteed?: Array<{ id: string; min?: number; max?: number }> };
};
export type Progress = Record<string, number>;
export type FarmNode = {
    id: string; campaign: string; campaignType: string; nodeNumber: number;
    energyCost: number; rate: number; materialId: string; unlocked: boolean;
    access: "unlocked" | "locked" | "unknown";
};

export function farmNodesFor(materialId: string, battles: Record<string, CampaignBattle>, progress: Progress): FarmNode[] {
    const nodes: FarmNode[] = [];
    for (const [id, battle] of Object.entries(battles)) {
        let rate = 0;
        for (const reward of battle.rewards?.guaranteed ?? []) if (reward.id === materialId) rate += reward.min ?? 1;
        for (const reward of battle.rewards?.potential ?? []) if (reward.id === materialId) rate += reward.effective_rate ?? 0;
        if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(battle.energyCost) || battle.energyCost <= 0 || !Number.isInteger(battle.nodeNumber) || battle.nodeNumber <= 0) continue;
        const frontier = progress[campaignKey(battle.campaign, battle.campaignType)];
        const known = frontier !== undefined && Number.isInteger(frontier) && frontier >= 0;
        const access = !known ? "unknown" : battle.nodeNumber <= frontier ? "unlocked" : "locked";
        nodes.push({ id, campaign: battle.campaign, campaignType: battle.campaignType, nodeNumber: battle.nodeNumber,
            energyCost: battle.energyCost, rate, materialId, access, unlocked: access === "unlocked" });
    }
    return nodes.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || a.energyCost / a.rate - b.energyCost / b.rate || a.id.localeCompare(b.id));
}

export function bestFarmNode(materialId: string, battles: Record<string, CampaignBattle>, progress: Progress) {
    return farmNodesFor(materialId, battles, progress).find(node => node.unlocked);
}

export function isEliteNode(node: Pick<FarmNode, "campaign" | "campaignType">): boolean {
    return campaignKey(node.campaign, node.campaignType).endsWith(" Elite");
}
