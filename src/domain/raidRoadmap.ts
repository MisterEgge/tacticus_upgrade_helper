import { laviscusRoadmap, type RoadmapCheckpoint, type RoadmapTarget } from "./laviscusRoadmap";

export type RaidUpgradeMember = { name: string; owned: boolean; activeTarget: string; passiveTarget: string };
const stages = [{ number: 2, rank: 12, cap: 36 }, { number: 5, rank: 15, cap: 44 },
    { number: 10, rank: 17, cap: 50 }, { number: 14, rank: 19, cap: 60 }];

function planningTarget(member: RaidUpgradeMember, rank: number, cap: number): RoadmapTarget
{
    const target: RoadmapTarget = { name: member.name, rank };
    // A range or research note does not establish a precise ability stop.
    if (/^\d+$/.test(member.activeTarget)) target.active = Math.min(Number(member.activeTarget), cap);
    if (/^\d+$/.test(member.passiveTarget)) target.passive = Math.min(Number(member.passiveTarget), cap);
    return target;
}

// Account planning adaptation: retain the graphic's exact targets only for selected
// characters. New flex use its rank stages and their own guidance, never another
// character's ability targets. Stage ranks are planning goals, not boss minimums.
export function selectedRaidRoadmap(members: RaidUpgradeMember[], ownedBiovore: boolean): RoadmapCheckpoint[]
{
    const owned = members.filter(member => member.owned);
    if (!members.some(member => member.name === "Laviscus")) {
        const machineSteps = laviscusRoadmap(null).filter(step => [3, 9, 13].includes(step.number));
        const characterStages: RoadmapCheckpoint[] = stages.map((stage, index) => ({
            number: index + 1, title: ["Lineup to Gold I", "Lineup to Diamond I", "Lineup to Diamond III", "Lineup to Adamantine II"][index]!,
            targets: [...owned.map(member => planningTarget(member, stage.rank, stage.cap)),
                ...(ownedBiovore && index !== 1 ? machineSteps[index === 0 ? 0 : index - 1]!.targets : [])]
        })).filter(checkpoint => checkpoint.targets.length);
        return characterStages;
    }

    const names = new Set(owned.map(member => member.name));
    if (ownedBiovore) names.add("Biovore");
    const buffers = owned.filter(member => ["Vitruvius", "Aesoth", "Dante"].includes(member.name));
    const checkpoints = laviscusRoadmap(null);
    for (const checkpoint of checkpoints)
    {
        checkpoint.targets = checkpoint.targets.filter(target => names.has(target.name));
        for (const buffer of buffers)
        {
            const source = laviscusRoadmap(buffer.name).find(step => step.number === checkpoint.number)!;
            checkpoint.targets.push(...source.targets.filter(target => target.name === buffer.name));
        }
        const stage = stages.find(stage => stage.number === checkpoint.number);
        if (stage) for (const member of owned)
        {
            const documented = ["Kariyan", "Laviscus", "Trajann", "Kharn", "Gulgortz", "Vitruvius", "Aesoth", "Dante"].includes(member.name);
            if (!documented) checkpoint.targets.push(planningTarget(member, stage.rank, stage.cap));
            else if (stage.number === 2 && ["Kharn", "Gulgortz"].includes(member.name)) checkpoint.targets.push({ name: member.name, rank: 12 });
        }
        if ([2, 5, 10, 14].includes(checkpoint.number)) checkpoint.title = {
            2: "Selected support to Gold I", 5: "Selected support to Diamond I", 10: "Selected support to Diamond III", 14: "Selected support to Adamantine II"
        }[checkpoint.number as 2 | 5 | 10 | 14];
        if ([6, 8, 12].includes(checkpoint.number) && checkpoint.targets.length) {
            checkpoint.title = `${checkpoint.targets.map(target => target.name).join(" and ")} to ${checkpoint.number === 6 ? "Diamond I" : checkpoint.number === 8 ? "Diamond III" : "Adamantine II"}`;
        }
    }
    return checkpoints.filter(checkpoint => checkpoint.targets.length);
}
