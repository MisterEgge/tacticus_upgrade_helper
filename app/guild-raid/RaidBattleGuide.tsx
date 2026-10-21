"use client";
import { useState } from "react";
import CharacterName from "../components/CharacterName";
import ViewTabs from "../components/ViewTabs";
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
    const positioning = <div className="raidPositioning" role="region" aria-label="Positioning guidance">
        {plan.bossGuide ? <p className="raidBossRule">{plan.bossGuide.position}</p> : <p>No positioning notes recorded for this boss. Check the map replay.</p>}
        <ul className="raidPositions">{plan.positions.map(position => <li key={position.character}>{portrait(position.character)}<span>{position.text}</span></li>)}</ul>
        <p className="sub">Check the matching map and tier for exact hexes.</p>
        <a className="sourceLink" href={RAID_PLAYBOOK_SOURCES.maps.url} target="_blank" rel="noreferrer">Open map gallery</a>{replay ? <> · <a className="sourceLink" href={replay.url} target="_blank" rel="noreferrer">Watch boss replay</a></> : null}
    </div>;
    return <section className="panel detailPanel raidGuidePanel" aria-label="Raid battle guide">
        <div className="raidBattleGuide">
            <h2>Battle guide</h2>
            {plan.bossGuide ? <p className="raidBossRule"><strong>{boss}: </strong>{plan.bossGuide.rule}</p> : null}
            <ViewTabs key={plan.available ? "rotation" : "positioning"} label="Battle guide views" defaultTab={plan.available ? "Turn order" : "Positioning"} tabs={[
            {label:"Turn order",content:!plan.available ? <p role="status">{plan.reason}</p> : <>
                <div className="raidTurnControls">
                    <div className="raidTurnButtons" role="group" aria-label="Battle turn">{plan.turns.map(step => <button key={step.turn} type="button" aria-label={`Show turn ${step.turn}`} aria-pressed={turn === step.turn} onClick={() => setTurn(step.turn)}>{step.turn}</button>)}</div>
                    <label>Kariyan actives<select aria-label="Kariyan active rotation" value={firstBurst} onChange={event => setFirstBurst(Number(event.target.value) as 2 | 3)}><option value={3}>Turns 3 + 6</option><option value={2}>Turns 2 + 5 · early burst</option></select></label>
                </div>
                {plan.warnings.map(warning => <p key={warning} className="raidGuideWarning" role="status">{warning}</p>)}
                {current ? <div className="raidTurn" role="region" aria-label={`Turn ${turn} actions`} aria-live="polite">
                    <h3>Turn {turn} · {current.title}</h3>
                    <p><strong>Before attacking: </strong>{current.setup}</p>
                    <ol className="raidActionOrder">{current.actions.map((action, index) => <li key={`${action.character}-${action.kind}-${index}`}>
                        {portrait(action.character)}<div><strong>{action.text}</strong>{action.condition ? <small>{action.condition}</small> : null}</div>
                    </li>)}</ol>
                    <p className="sub">{current.note}</p>
                </div> : null}
            </>},
            {label:"Positioning",content:positioning}
            ]}/>
            <ReferenceDetails label="Map, replay and mechanics">
                {replay ? <p><a href={replay.url} target="_blank" rel="noreferrer">{replay.creator} replay · {replay.tier} · {replay.map}</a><br/>{plan.replayMatches ? "Same five characters and Machine of War; confirm your map and tier." : "Reference lineup differs from your selection; its turn order cannot be copied unchanged."}<br/>{replay.lineup.join(" · ")} + {replay.machine}.</p> : null}
                <p><a href={RAID_PLAYBOOK_SOURCES.replays.url} target="_blank" rel="noreferrer">Find the matching boss / map / tier replay</a> · <a href={RAID_PLAYBOOK_SOURCES.maps.url} target="_blank" rel="noreferrer">Map gallery</a></p>
                <p>{plan.machineNote}</p>
                <p>Ability mechanics checked {RAID_PLAYBOOK_REVIEWED}.{plan.bossGuide?.reviewedOn ? ` Boss guidance checked ${plan.bossGuide.reviewedOn}.` : ""} Ability rules support this suggested rotation; linked replay footage has not been transcribed into exact tile instructions. Unresearched flex actives remain manual.</p>
                <ul>{Object.entries(RAID_PLAYBOOK_SOURCES).filter(([key]) => !["replays", "maps"].includes(key)).map(([key, source]) => <li key={key}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}{plan.bossGuide ? <li><a href={plan.bossGuide.url} target="_blank" rel="noreferrer">{boss} mechanics</a></li> : null}</ul>
            </ReferenceDetails>
        </div>
    </section>;
}
