"use client";
import { useState } from "react";
import CharacterName from "../components/CharacterName";
import CollapsibleSection from "../components/CollapsibleSection";
import ReferenceDetails from "../components/ReferenceDetails";
import { raidPlaybook, RAID_PLAYBOOK_REVIEWED, RAID_PLAYBOOK_SOURCES } from "../../src/domain/raidPlaybook";

type Member = { name: string; id: string; icon?: string | undefined };
export default function RaidBattleGuide({ boss, teamName, members, machine }: { boss: string; teamName: string; members: Member[]; machine: string | null })
{
    const [turn, setTurn] = useState(1);
    const [firstBurst, setFirstBurst] = useState<2 | 3>(3);
    const plan = raidPlaybook(boss, teamName, members.map(member => member.name), machine, firstBurst);
    const current = plan.turns[turn - 1];
    const portrait = (name: string) => { const member = members.find(member => member.name === name); return <CharacterName name={name} id={member?.id} icon={member?.icon}/>; };
    const replay = plan.bossGuide?.replay;
    return <CollapsibleSection title="Battle guide" summary={`${teamName} vs ${boss} · ${plan.available ? `Turn ${turn} of 6` : "Rotation needs research"}`} className="panel detailPanel" label="Raid battle guide">
        <div className="raidBattleGuide">
            {plan.bossGuide ? <p className="raidBossRule"><strong>{boss}: </strong>{plan.bossGuide.rule}</p> : null}
            {!plan.available ? <p role="status">{plan.reason}</p> : <>
                <div className="raidTurnControls">
                    <div className="raidTurnButtons" role="group" aria-label="Battle turn">{plan.turns.map(step => <button key={step.turn} type="button" aria-label={`Show turn ${step.turn}`} aria-pressed={turn === step.turn} onClick={() => setTurn(step.turn)}>{step.turn}</button>)}</div>
                    <label>Kariyan actives<select aria-label="Kariyan active rotation" value={firstBurst} onChange={event => setFirstBurst(Number(event.target.value) as 2 | 3)}><option value={3}>Turns 3 + 6</option><option value={2}>Turns 2 + 5 · early burst</option></select></label>
                </div>
                <p className="sub">Suggested rotation. Use legal, safe attacks; delayed actives change later cooldowns.</p>
                {plan.warnings.map(warning => <p key={warning} className="raidGuideWarning" role="status">{warning}</p>)}
                <CollapsibleSection title="Positioning" summary="Boss adjacency · Aesoth range · safe exits" defaultOpen={false}>
                    {plan.bossGuide ? <p>{plan.bossGuide.position}</p> : null}
                    <ul className="raidPositions">{plan.positions.map(position => <li key={position.character}>{portrait(position.character)}<span>{position.text}</span></li>)}</ul>
                    <p className="sub">Relative placement only. Exact hexes depend on the map, tier and boss movement; use the map reference below.</p>
                </CollapsibleSection>
                {current ? <div className="raidTurn" role="region" aria-label={`Turn ${turn} actions`} aria-live="polite">
                    <h3>Turn {turn} · {current.title}</h3>
                    <p><strong>Before attacking: </strong>{current.setup}</p>
                    <ol className="raidActionOrder">{current.actions.map((action, index) => <li key={`${action.character}-${action.kind}-${index}`}>
                        {portrait(action.character)}<div><strong>{action.text}</strong>{action.condition ? <small>{action.condition}</small> : null}</div>
                    </li>)}</ol>
                    <p className="sub">{current.note}</p>
                </div> : null}
            </>}
            <ReferenceDetails label="Map, replay and mechanics">
                {replay ? <p><a href={replay.url} target="_blank" rel="noreferrer">{replay.creator} replay · {replay.tier} · {replay.map}</a><br/>{plan.replayMatches ? "Same five characters and Machine of War; confirm your map and tier." : "Reference lineup differs from your selection; its turn order cannot be copied unchanged."}<br/>{replay.lineup.join(" · ")} + {replay.machine}.</p> : null}
                <p><a href={RAID_PLAYBOOK_SOURCES.replays.url} target="_blank" rel="noreferrer">Find the matching boss / map / tier replay</a> · <a href={RAID_PLAYBOOK_SOURCES.maps.url} target="_blank" rel="noreferrer">Map gallery</a></p>
                <p>{plan.machineNote}</p>
                <p>Checked {RAID_PLAYBOOK_REVIEWED}. Ability rules support this suggested rotation; linked replay footage has not been transcribed into exact tile instructions. Unresearched flex actives remain manual.</p>
                <ul>{Object.entries(RAID_PLAYBOOK_SOURCES).filter(([key]) => !["replays", "maps"].includes(key)).map(([key, source]) => <li key={key}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}{plan.bossGuide ? <li><a href={plan.bossGuide.url} target="_blank" rel="noreferrer">{boss} mechanics</a></li> : null}</ul>
            </ReferenceDetails>
        </div>
    </CollapsibleSection>;
}
