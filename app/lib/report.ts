import fs from "node:fs/promises";
import path from "node:path";

export type EquipmentRow = {
  character: string;
  slotId: string;
  currentItem: string;
  currentRarity: string;
  currentLevel: number;
  accountPriority: number;
  recommendedItem?: string;
  compatibleLegendaryItemIds?: string[];
  preferredLegendaryItemIds?: string[];
  preferredLegendaryItems?: string[];
};

export type Report = {
  generatedAt: string;
  source: { player: string; powerLevel: number };
  summary: { units: number; charactersWithAbilitiesBelow17: number; individualAbilityUpgradesTo17: number; legendaryUnderTierSlots: number };
  equipmentAllocation: { equipNow: EquipmentRow[]; buyWatch: EquipmentRow[]; compatibilityUnknown: EquipmentRow[] };
};

export async function getReport(): Promise<Report | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), "output", "upgrade-report.json"), "utf8")) as Report;
  } catch { return null; }
}

export function targetName(row: EquipmentRow) {
  return row.recommendedItem ?? row.preferredLegendaryItems?.join(", ") ?? row.preferredLegendaryItemIds?.join(", ") ?? "Review";
}
