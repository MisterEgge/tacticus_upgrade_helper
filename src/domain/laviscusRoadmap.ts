export type RoadmapTarget = { name: string; rank?: number; active?: number; passive?: number; rarity?: string };
export type RoadmapCheckpoint = { number: number; title: string; targets: RoadmapTarget[] };
type Unit = { name: string; rank: number; rarity: string; abilities: { level: number }[] };

// Transcribed from Mawg's user-supplied Laviscus Team Roadmap. An X in the graphic
// means that ability has no checkpoint target, so it is intentionally omitted.
export const LAVISCUS_ROADMAP_SOURCE = "https://www.reddit.com/r/WH40KTacticus/comments/1tzgkco/laviscus_team_roadmap_infographic/";

export function laviscusBuffer(owned: Set<string>): string | null
{
    return ["Vitruvius", "Aesoth", "Dante"].find(name => owned.has(name)) ?? null;
}

export function laviscusRoadmap(buffer: string | null): RoadmapCheckpoint[]
{
    const core = (rank: number, kariyan: number, trajann: number, laviscusPassive = 36): RoadmapTarget[] => [
        { name: "Kariyan", rank, active: kariyan, passive: kariyan },
        { name: "Laviscus", rank, passive: laviscusPassive },
        { name: "Trajann", rank, passive: trajann }
    ];
    const bufferTarget = (rank: number, passive: number): RoadmapTarget[] => buffer ? [{ name: buffer, rank, passive }] : [];
    return [
        { number: 1, title: "Core to Gold I", targets: core(12, 36, 36) },
        { number: 2, title: "One buffer to Gold I", targets: bufferTarget(12, 36) },
        { number: 3, title: "Start Biovore", targets: [{ name: "Biovore", active: 30, passive: 30 }] },
        { number: 4, title: "Core to Diamond I", targets: core(15, 44, 44) },
        { number: 5, title: "Buffer to Diamond I", targets: bufferTarget(15, buffer === "Vitruvius" ? 44 : 36) },
        { number: 6, title: "Khârn and Boss to Diamond I", targets: [{ name: "Kharn", rank: 15 }, { name: "Gulgortz", rank: 15, active: 44, passive: 44 }] },
        { number: 7, title: "Core to Diamond III", targets: core(17, 50, 50) },
        { number: 8, title: "Khârn and Boss to Diamond III", targets: [{ name: "Kharn", rank: 17 }, { name: "Gulgortz", rank: 17, active: 50, passive: 50 }] },
        { number: 9, title: "Biovore to 50/50", targets: [{ name: "Biovore", active: 50, passive: 50 }] },
        { number: 10, title: "Buffer to Diamond III", targets: bufferTarget(17, buffer === "Vitruvius" || buffer === "Dante" ? 50 : 36) },
        { number: 11, title: "Core damage to Adamantine II", targets: [{ name: "Laviscus", rank: 19, active: 50, passive: 36 }, { name: "Kariyan", rank: 19, active: 60, passive: 60 }] },
        { number: 12, title: "Trajann, Khârn, and Boss to Adamantine II", targets: [{ name: "Trajann", rank: 19, passive: 60 }, { name: "Kharn", rank: 19, active: 50, passive: 50 }, { name: "Gulgortz", rank: 19, active: 50, passive: 60 }] },
        { number: 13, title: "Mythic Biovore spores", targets: [{ name: "Biovore", rarity: "Mythic", active: 60, passive: 60 }] },
        { number: 14, title: "Buffer to Adamantine II", targets: bufferTarget(19, buffer === "Vitruvius" || buffer === "Dante" ? 60 : 36) }
    ];
}

export function roadmapTargetMet(target: RoadmapTarget, unit: Unit | undefined): boolean
{
    if (!unit) return false;
    const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
    return (target.rank === undefined || unit.rank >= target.rank)
        && (target.active === undefined || (unit.abilities[0]?.level ?? 0) >= target.active)
        && (target.passive === undefined || (unit.abilities[1]?.level ?? 0) >= target.passive)
        && (target.rarity === undefined || rarityOrder.indexOf(unit.rarity) >= rarityOrder.indexOf(target.rarity));
}

export function firstPendingCheckpoint(checkpoints: RoadmapCheckpoint[], units: Unit[]): number | null
{
    const byName = new Map(units.map(unit => [unit.name, unit]));
    return checkpoints.find(checkpoint => checkpoint.targets.length === 0 || checkpoint.targets.some(target => !roadmapTargetMet(target, byName.get(target.name))))?.number ?? null;
}

export function nextRoadmapTargets(checkpoints: RoadmapCheckpoint[], units: Unit[]): { checkpoint: number; targets: RoadmapTarget[] } | null
{
    const byName = new Map(units.map(unit => [unit.name, unit]));
    const pending = checkpoints.find(checkpoint => checkpoint.targets.length === 0 || checkpoint.targets.some(target => !roadmapTargetMet(target, byName.get(target.name))));
    return pending ? { checkpoint: pending.number, targets: pending.targets.filter(target => !roadmapTargetMet(target, byName.get(target.name))) } : null;
}
