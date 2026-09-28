export type WarGearItem = { slotId: string; rarity?: string; level: number; name?: string };
export type WarGearCap = "silver" | "gold";

export type WarGearStatus = {
    ready: number;
    total: number;
    missing: Array<{ slotId: string; rarity: string; level: number }>;
};

/**
 * Higher rarity items cap down to the lineup's maximum gear value in War.
 * A Rare lineup needs Rare 7 or any higher-rarity item; an Epic lineup
 * needs Epic 9 or any higher-rarity item.
 */
export function warGearStatus(items: WarGearItem[] | undefined | null, cap:WarGearCap="gold"): WarGearStatus
{
    const slots = ["Slot1", "Slot2", "Slot3"];
    const bySlot = new Map((items ?? []).map((item) => [item.slotId, item]));
    const missing = slots.flatMap((slotId) =>
    {
        const item = bySlot.get(slotId);
        const rarity = item?.rarity ?? "Unequipped";
        const level = item?.level ?? 0;
        const ready = cap === "silver"
            ? rarity === "Rare" ? level >= 7 : ["Epic","Legendary","Mythic"].includes(rarity) && level >= 1
            : rarity === "Epic" ? level >= 9 : ["Legendary","Mythic"].includes(rarity) && level >= 1;
        return ready ? [] : [{ slotId, rarity, level }];
    });

    return { ready: slots.length - missing.length, total: slots.length, missing };
}

export function warGearLabel(items: WarGearItem[] | undefined | null,cap:WarGearCap="gold"): { summary: string; detail: string; ready: boolean }
{
    const status = warGearStatus(items,cap);
    const baseline=cap==="silver"?"Rare 7 or higher rarity":"Epic 9 or higher rarity";
    if (status.ready === status.total) return { summary: "War gear ready", detail: `${baseline} baseline met`, ready: true };
    const missing = status.missing.map((item) => `${item.slotId.replace("Slot", "S")}: ${item.rarity} ${item.level}`).join(" · ");
    return { summary: `${status.ready}/${status.total} War-ready`, detail: `${missing} → ${baseline}`, ready: false };
}
