import ReferenceDetails from "../components/ReferenceDetails";
import Link from "next/link";
import { rankName } from "../../src/domain/ranks";
import { LAVISCUS_ROADMAP_SOURCE, nextRoadmapTargets, roadmapTargetMet, type RoadmapTarget } from "../../src/domain/laviscusRoadmap";
import { selectedRaidRoadmap, type RaidUpgradeMember } from "../../src/domain/raidRoadmap";
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

export default function LaviscusRoadmap({ roster, members, machine }: { roster: RosterUnit[]; members: RaidUpgradeMember[]; machine?: string | undefined })
{
    const units = new Map(roster.map(unit => [unit.name, unit]));
    const checkpoints = selectedRaidRoadmap(members, units.has("Biovore") && (!machine || machine === "Biovore"));
    const laviscus = members.some(member => member.name === "Laviscus");
    const work = nextRoadmapTargets(checkpoints, roster);
    const next = work?.checkpoint ?? null;
    const hasWork = checkpoints.length > 0;

    return <section className="panel detailPanel roadmapPanel"><div className="sectionTitle"><div><p className="eyebrow">{laviscus ? "LAVISCUS BUILD ORDER" : "RAID BUILD ORDER"}</p><h2>Raid team roadmap</h2><p className="sub">Planning stages for your selected lineup. Complete the next checkpoint before moving to later goals.</p></div><div className="power">{next ? `Checkpoint ${next}` : hasWork ? "All met" : "Unlock lineup"}<strong> next</strong></div></div>
        <div className="roadmapIntro">Build the selected owned lineup: <strong>{members.filter(member => member.owned).map(member => member.name).join(" · ") || "No selected characters owned"}</strong>.<ReferenceDetails label="Roadmap source and ability order"><p>This is an account plan adapted from <a href={LAVISCUS_ROADMAP_SOURCE} target="_blank" rel="noreferrer">the Laviscus source roadmap</a>. Selected source characters keep their documented checkpoints. Other selected characters use Gold I → Diamond I → Diamond III → Adamantine II planning stages and their own ability guidance. These ranks are planning goals, not verified boss minimums; the ability table above retains each target's evidence. Unselected and unowned characters are excluded from current upgrade work.</p><p>Kariyan, Boss, and Khârn passive before active; Biovore primary before secondary. Biovore is a separate machine of war, not a sixth lineup character. Its source checkpoints appear only when owned and compatible with the boss recommendation. {machine ? `The boss guide recommends ${machine}; upgrade targets for other machines need research.` : "No boss-specific machine recommendation recorded."}</p></ReferenceDetails></div>
        <div className="roadmapNow"><h3>Do next · checkpoint {next ?? (hasWork ? "complete" : "unlock lineup")}</h3>{work?.targets.length ? <><div className="roadmapNowGrid">{work.targets.map(target =>
        {
            const unit = units.get(target.name);
            return <div className="roadmapNowItem" key={target.name}><strong>{target.name}</strong><span>{targetDetails(target, unit).join(" · ")}</span>{unit && target.rank !== undefined && unit.rank < target.rank && target.name !== "Biovore" ? <Link href={`/farming?character=${encodeURIComponent(unit.id)}&target=${target.rank}`}>Plan rank materials →</Link> : null}</div>;
        })}</div></> : <p>{hasWork ? "All selected lineup checkpoints are met." : "Unlock selected characters to begin their upgrade plan."}</p>}</div>
        <div className="roadmapList">{checkpoints.map(checkpoint =>
        {
            const complete = checkpoint.targets.length > 0 && checkpoint.targets.every(target => roadmapTargetMet(target, units.get(target.name)));
            return <details className="roadmapCheckpoint" key={checkpoint.number}><summary><span className="campaignChevron" aria-hidden="true">⌄</span><span><strong>Checkpoint {checkpoint.number}: {checkpoint.title}</strong><small>{complete ? "Target met" : checkpoint.number === next ? "Work on this next" : "Later goal"}</small></span></summary><div className="roadmapTargets">{checkpoint.targets.length ? checkpoint.targets.map(target =>
                {
                    const unit = units.get(target.name);
                    return <div className="roadmapTarget" key={target.name}><strong>{unit && target.name !== "Biovore" ? <Link href={`/characters/${encodeURIComponent(unit.id)}`}>{target.name}</Link> : target.name}</strong><span>{targetDetails(target, unit).join(" · ")}</span></div>;
                }) : <p>Choose an owned buffer to see account-specific targets.</p>}</div></details>;
        })}</div>
    </section>;
}
