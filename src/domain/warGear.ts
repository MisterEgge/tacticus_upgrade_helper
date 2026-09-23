export type WarGearItem = { slotId: string; rarity?: string; level: number; name?: string };

export type WarGearStatus = {
    ready: number;
    total: number;
    missing: Array<{ slotId: string; rarity: string; level: number }>;
};

/**
 * War aims for the fully-refined stat breakpoint, not Legendary rarity alone:
 * Epic 9 and Legendary 1 have the same comparison value.
 */
export function warGearStatus(items: WarGearItem[] | undefined | null): WarGearStatus
{
    const slots = ["Slot1", "Slot2", "Slot3"];
    const bySlot = new Map((items ?? []).map((item) => [item.slotId, item]));
    const missing = slots.flatMap((slotId) =>
    {
        const item = bySlot.get(slotId);
        const rarity = item?.rarity ?? "Unequipped";
        const level = item?.level ?? 0;
        const ready = rarity === "Epic" ? level >= 9 : rarity === "Legendary" || rarity === "Mythic" ? level >= 1 : false;
        return ready ? [] : [{ slotId, rarity, level }];
    });

    return { ready: slots.length - missing.length, total: slots.length, missing };
}

export function warGearLabel(items: WarGearItem[] | undefined | null): { summary: string; detail: string; ready: boolean }
{
    const status = warGearStatus(items);
    if (status.ready === status.total) return { summary: "War gear ready", detail: "Epic 9 / Legendary 1 baseline met", ready: true };
    const missing = status.missing.map((item) => `${item.slotId.replace("Slot", "S")}: ${item.rarity} ${item.level}`).join(" · ");
    return { summary: `${status.ready}/${status.total} War-ready`, detail: `${missing} → Epic 9 or Legendary 1`, ready: false };
}
