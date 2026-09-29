import Link from "next/link";
import { rankName } from "../../src/domain/ranks";
import { laviscusBuffer, laviscusRoadmap, LAVISCUS_ROADMAP_SOURCE, nextRoadmapTargets, roadmapTargetMet, type RoadmapTarget } from "../../src/domain/laviscusRoadmap";
import { raidAbilityStep } from "../../src/domain/raidAbilityStep";
import type { RosterUnit } from "../lib/report";

function targetDetails(target: RoadmapTarget, unit: RosterUnit | undefined): string[]
{
    if (!unit) return ["Not owned · cannot build this checkpoint yet"];
    const lines: string[] = [];
    if (target.rank !== undefined) lines.push(unit.rank >= target.rank ? `${rankName(target.rank)} target met` : `${rankName(unit.rank)} → ${rankName(target.rank)}`);
    if (target.rarity) lines.push(unit.rarity === target.rarity ? `${target.rarity} target met` : `${unit.rarity} → ${target.rarity}`);
    const abilities = [["active", 0, target.name === "Biovore" ? "Primary" : "Active"], ["passive", 1, target.name === "Biovore" ? "Secondary" : "Passive"]] as const;
    for (const [key, index, label] of ["Kariyan", "Gulgortz", "Kharn"].includes(target.name) ? [...abilities].reverse() : abilities)
    {
        const goal = target[key];
        if (goal === undefined) continue;
        const current = unit.abilities[index]?.level ?? 0;
        lines.push(current >= goal ? `${label} ${goal} target met` : `${label} ${current} → ${goal}${target.name === "Biovore" ? "" : ` · ${raidAbilityStep(current, String(goal), unit.xpLevel, unit.rarity)}`}`);
    }
    return lines;
}

export default function LaviscusRoadmap({ roster }: { roster: RosterUnit[] })
{
    const units = new Map(roster.map(unit => [unit.name, unit]));
    const buffer = laviscusBuffer(new Set(units.keys()));
    const checkpoints = laviscusRoadmap(buffer);
    const work = nextRoadmapTargets(checkpoints, roster);
    const next = work?.checkpoint ?? null;

    return <section className="panel detailPanel roadmapPanel"><div className="sectionTitle"><div><p className="eyebrow">LAVISCUS BUILD ORDER</p><h2>Raid team roadmap</h2><p className="sub">Follow checkpoints in order. First build the Kariyan, Laviscus, and Trajann core, then one buffer, Biovore, Khârn, and Boss. Rank and ability targets below are from the supplied roadmap; abilities marked X in the image have no target here.</p></div><div className="power">{next ? `Checkpoint ${next}` : "All met"}<strong> next</strong></div></div>
        <div className="roadmapIntro">{buffer ? <>Buffer to build: <strong>{buffer}</strong> · source preference Vitruvius → Aesoth → Dante, limited to your owned roster.</> : <>No listed buffer owned. Review Vitruvius, Aesoth, or Dante before checkpoint 2.</>} <a href={LAVISCUS_ROADMAP_SOURCE} target="_blank" rel="noreferrer">Source roadmap ↗</a><small>Ability order in the priority box: Kariyan, Boss, and Khârn passive before active; Biovore primary before secondary. The image starts with campaign carries to Gold I and Elite nodes. Track those campaign goals on the Campaigns page. Biovore is a separate machine of war, not a sixth lineup character.</small></div>
        <div className="roadmapNow"><h3>Do next · checkpoint {next ?? "complete"}</h3>{work?.targets.length ? <><p>These targets remain in the first unfinished checkpoint. The source does not rank characters within a checkpoint.</p><div className="roadmapNowGrid">{work.targets.map(target =>
        {
            const unit = units.get(target.name);
            return <div className="roadmapNowItem" key={target.name}><strong>{target.name}</strong><span>{targetDetails(target, unit).join(" · ")}</span>{unit && target.rank !== undefined && unit.rank < target.rank && target.name !== "Biovore" ? <Link href={`/farming?character=${encodeURIComponent(unit.id)}&target=${target.rank}`}>Plan rank materials →</Link> : null}</div>;
        })}</div></> : <p>{next === null ? "All recorded roadmap checkpoints are met." : "Choose an owned buffer to continue this checkpoint."}</p>}</div>
        <div className="roadmapList">{checkpoints.map(checkpoint =>
        {
            const complete = checkpoint.targets.length > 0 && checkpoint.targets.every(target => roadmapTargetMet(target, units.get(target.name)));
            return <details className="roadmapCheckpoint" key={checkpoint.number} open={checkpoint.number === next ? true : undefined}><summary><span className="campaignChevron" aria-hidden="true">⌄</span><span><strong>Checkpoint {checkpoint.number}: {checkpoint.title}</strong><small>{complete ? "Target met" : checkpoint.number === next ? "Work on this next" : "Later goal"}</small></span></summary><div className="roadmapTargets">{checkpoint.targets.length ? checkpoint.targets.map(target =>
                {
                    const unit = units.get(target.name);
                    return <div className="roadmapTarget" key={target.name}><strong>{unit && target.name !== "Biovore" ? <Link href={`/characters/${encodeURIComponent(unit.id)}`}>{target.name}</Link> : target.name}</strong><span>{targetDetails(target, unit).join(" · ")}</span></div>;
                }) : <p>Choose an owned buffer to see account-specific targets.</p>}</div></details>;
        })}</div>
    </section>;
}
