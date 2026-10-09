"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReferenceDetails from "../components/ReferenceDetails";
import CollapsibleSection from "../components/CollapsibleSection";
import CharacterName from "../components/CharacterName";
import { rankName } from "../../src/domain/ranks";
import type { RaidTeam } from "../../src/domain/raidMeta";
import { raidCandidates, suggestedRaidLineup } from "../../src/domain/raidLineup";
import { RAID_MACHINES, recommendedRaidMachine, suggestedRaidMachine } from "../../src/domain/raidMachine";
import { raidAbilityStep } from "../../src/domain/raidAbilityStep";
import { abilityTargetMet, formatAbilityTarget } from "../../src/domain/targetDisplay";
import { selectedRaidNames, type RaidSelection } from "../../src/domain/raidSelection";
import type { RosterUnit } from "../lib/report";
import LaviscusRoadmap from "./LaviscusRoadmap";
import RaidBattleGuide from "./RaidBattleGuide";

type Member = { name: string; id: string; icon?: string | undefined; owned: boolean; rarity: string | null; rank: number | null; xpLevel: number | null; activeLevel: number | null; passiveLevel: number | null; activeTarget: string; passiveTarget: string; activeBasis: string; passiveBasis: string };
type Team = RaidTeam & { members: Member[] };
type Teams = Record<string, Record<string, Team>>;

export default function GuildRaidPlanner({ teams, source, mainSelection, roster }: { teams: Teams; source: { sourceUrl: string; reviewedOn: string; note: string }; mainSelection: RaidSelection; roster: RosterUnit[] })
{
    const router = useRouter();
    const [boss, setBoss] = useState(mainSelection.boss);
    const [teamName, setTeamName] = useState(mainSelection.teamName);
    const [lineup, setLineup] = useState(selectedRaidNames(mainSelection, teams[mainSelection.boss]![mainSelection.teamName]!));
    const [autoFlex, setAutoFlex] = useState(mainSelection.autoFlex !== false);
    const ownedMachines = RAID_MACHINES.filter(machine => roster.some(unit => unit.id === machine.id));
    const machineNames = new Set<string>(ownedMachines.map(machine => machine.name));
    const [machine, setMachine] = useState<string | null>(mainSelection.machine ?? suggestedRaidMachine(teams[mainSelection.boss]![mainSelection.teamName]!, machineNames));
    const [autoMachine, setAutoMachine] = useState(mainSelection.autoMachine !== false);
    const [saved, setSaved] = useState(mainSelection);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const team = teams[boss]![teamName]!;
    const suggested = suggestedRaidLineup(team);
    const recommendation = team.recommendation;
    const preferredMachine = recommendedRaidMachine(team);
    const selectedMachine = RAID_MACHINES.find(option => option.name === machine);
    const machineUnit = roster.find(unit => unit.id === selectedMachine?.id);
    const members = lineup.map(name => team.members.find(member => member.name === name)!).filter(Boolean);
    const missingCore = team.core.filter(name => !team.members.find(member => member.name === name)?.owned);
    const substitutes = members.filter(member => !team.core.includes(member.name) && !team.flex.includes(member.name));
    const matchesRecommendation = !!recommendation && lineup.length === 5 && recommendation.lineup.every(name => lineup.includes(name)) && machine === recommendation.machine;
    const selection: RaidSelection = { boss, teamName, lineup, flex: lineup.filter(name => !team.core.includes(name)), autoFlex, machine, autoMachine };
    const isSaved = saved.boss === boss && saved.teamName === teamName
        && JSON.stringify(selectedRaidNames(saved, team)) === JSON.stringify(lineup)
        && (saved.autoFlex !== false) === autoFlex && saved.machine === machine && (saved.autoMachine !== false) === autoMachine;

    function chooseTeam(nextBoss: string, nextTeam: string)
    {
        const next = teams[nextBoss]![nextTeam]!;
        setBoss(nextBoss); setTeamName(nextTeam); setLineup(suggestedRaidLineup(next)); setAutoFlex(true);
        setMachine(suggestedRaidMachine(next, machineNames)); setAutoMachine(true);
    }

    async function saveMainTeam()
    {
        setSaving(true); setSaveError("");
        try {
            const response = await fetch("/api/raid-selection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selection) });
            if (!response.ok) throw new Error("Could not save this lineup. Try again.");
            setSaved(selection); router.refresh();
        } catch (error) { setSaveError(error instanceof Error ? error.message : "Could not save this lineup."); }
        finally { setSaving(false); }
    }

    return <>
        <CollapsibleSection title="Raid team" summary={`${teamName} vs ${boss} · ${members.length}/5 owned characters · ${machine ?? "No owned Machine of War"}`} className="panel detailPanel">
            <div className="abilityViews">
                <label>Raid boss<select value={boss} onChange={event => chooseTeam(event.target.value, Object.keys(teams[event.target.value]!)[0]!)}>{Object.keys(teams).map(name => <option key={name}>{name}</option>)}</select></label>
                <label>Meta team<select value={teamName} onChange={event => chooseTeam(boss, event.target.value)}>{Object.keys(teams[boss]!).map(name => <option key={name}>{name}</option>)}</select></label>
                {Array.from({ length: 5 }, (_, index) => <label key={index}>Character slot {index + 1}<select value={lineup[index] ?? ""} onChange={event => {
                    const next = [...lineup]; next[Math.min(index, next.length)] = event.target.value; setLineup(next); setAutoFlex(false);
                }}>
                    {!lineup[index] ? <option value="">Insufficient owned substitutes</option> : null}
                    {raidCandidates(team).filter(name => !lineup.includes(name) || lineup[index] === name).map(name => <option key={name} value={name} disabled={!team.members.find(member => member.name === name)?.owned}>{name}{team.members.find(member => member.name === name)?.owned ? "" : " · not owned"}</option>)}
                </select></label>)}
                <label>Machine of War<select value={machine ?? ""} onChange={event => { setMachine(event.target.value || null); setAutoMachine(false); }}>
                    {!machine ? <option value="">No owned Machine of War</option> : null}
                    {RAID_MACHINES.filter(option => !team.excludedMachines?.includes(option.name)).map(option => <option key={option.id} value={option.name} disabled={!machineNames.has(option.name)}>{option.name}{option.name === preferredMachine ? " · recommended" : ""}{machineNames.has(option.name) ? "" : " · not owned"}</option>)}
                </select></label>
            </div>
            <div className="raidSave">
                <button type="button" onClick={() => { setLineup(suggested); setAutoFlex(true); setMachine(suggestedRaidMachine(team, machineNames)); setAutoMachine(true); }} disabled={autoFlex && autoMachine && JSON.stringify(lineup) === JSON.stringify(suggested) && machine === suggestedRaidMachine(team, machineNames)}>Use recommended owned team</button>
                <button type="button" onClick={saveMainTeam} disabled={saving || isSaved || lineup.length < 5}>{saving ? "Saving…" : isSaved ? "Main team saved" : "Set as main Raid team"}</button>
                {saveError ? <small role="alert">{saveError}</small> : null}
            </div>
            <div className="raidTeamSummary">
                <div><small>SELECTED LINEUP</small><strong>{members.length}/5 owned characters + {machineUnit ? "1 Machine of War" : "no owned Machine of War"}</strong><span>{lineup.join(" · ")}{machine ? ` · MoW: ${machine}` : ""}</span></div>
                <div><small>{autoFlex ? "AUTOMATIC OWNED TEAM" : "MANUAL LINEUP"}</small><span>{matchesRecommendation ? "Matches the cited five-character and machine recommendation" : "Assembled owned lineup · exact performance unverified"}</span></div>
                {missingCore.length ? <div><small>META CORE NOT OWNED</small><span>{missingCore.join(" · ")} · owned substitutes selected below</span></div> : null}
                {substitutes.length ? <div><small>OWNED SUBSTITUTES</small><span>{substitutes.map(member => member.name).join(" · ")}</span></div> : null}
                {lineup.length < 5 ? <div role="status"><strong>{5 - lineup.length} character slots still unfilled</strong><span>Not enough owned candidates for this archetype. Choose another team or unlock additional substitutes.</span></div> : null}
                <ReferenceDetails label="Meta source">
                    <p>{source.note} <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source: Tacticus Codex</a> · reviewed {source.reviewedOn}.</p>
                    {recommendation ? <p>Boss reference: {recommendation.lineup.join(" · ")} + {recommendation.machine}. <a href={recommendation.sourceUrl} target="_blank" rel="noreferrer">Terminus Maximus replay guide</a> · updated {recommendation.sourceUpdatedOn}, checked {recommendation.reviewedOn} · {recommendation.replays} replays. Character or machine substitutions do not inherit its measured performance.</p> : <p>No ranked exact five recorded for this core. Owned alternatives and substitutes form an assembled deployment lineup.</p>}
                    {team.fallbackNote ? <p>{team.fallbackNote}</p> : null}
                    {team.restrictionNote ? <p>{team.restrictionNote} <a href="https://tacticus.wiki.gg/wiki/Guild_Raid" target="_blank" rel="noreferrer">Boss faction restrictions</a>.</p> : null}
                </ReferenceDetails>
            </div>
        </CollapsibleSection>
        <RaidBattleGuide key={`${boss}-${teamName}-${lineup.join("|")}-${machine}`} boss={boss} teamName={teamName} members={members} machine={machine}/>
        <CollapsibleSection title={`${teamName} vs ${boss}`} summary="Raid character upgrades · targets follow the selected five" className="panel detailPanel">
            <p className="sub">Upgrade steps respect current XP and rarity. Check badges and coins before spending.</p>
            <div className="tableWrap"><table><thead><tr><th>Character</th><th>Rank / level</th><th>Ability steps and targets</th></tr></thead><tbody>{members.map(member => <tr key={member.name}>
                <td><Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link><small>{team.core.includes(member.name) ? "Owned core" : team.flex.includes(member.name) ? "Owned flex" : "Owned substitute"}</small></td>
                <td>{member.rank === null ? "—" : rankName(member.rank)}<small>Level {member.xpLevel ?? "—"}</small></td>
                <td><strong>Active {formatAbilityTarget(member.activeLevel, member.activeTarget)}</strong><small>{abilityTargetMet(member.activeLevel, member.activeTarget) ? "Current level " + member.activeLevel : raidAbilityStep(member.activeLevel, member.activeTarget, member.xpLevel, member.rarity)}</small>
                    <strong>Passive {formatAbilityTarget(member.passiveLevel, member.passiveTarget)}</strong><small>{abilityTargetMet(member.passiveLevel, member.passiveTarget) ? "Current level " + member.passiveLevel : raidAbilityStep(member.passiveLevel, member.passiveTarget, member.xpLevel, member.rarity)}</small>
                    <ReferenceDetails label="Ability target basis"><p>Active: {member.activeBasis}</p><p>Passive: {member.passiveBasis}</p></ReferenceDetails></td>
            </tr>)}</tbody></table></div>
        </CollapsibleSection>
        <CollapsibleSection title="Machine of War plan" summary={machineUnit ? `${machine} · ${machineUnit.rarity} · primary ${machineUnit.abilities[0]?.level ?? "unknown"}, secondary ${machineUnit.abilities[1]?.level ?? "unknown"}` : "No owned Machine of War selected"} className="panel detailPanel">
            {machineUnit && selectedMachine ? <CharacterName name={selectedMachine.name} id={selectedMachine.id}/> : null}
            <p>Meta machine: <strong>{preferredMachine ?? "Research needed"}</strong>. {machine === preferredMachine ? "Recommended machine selected." : machine ? `Using owned ${machine} as a fallback; exact team performance is unverified.` : "Unlock a Machine of War to complete the support slot."}</p>
            <p>{machine === "Biovore" ? "Biovore primary before secondary; documented ability checkpoints appear in the roadmap below." : "Verified ability targets for this machine need research. Current levels are shown above; character rank and badge costs are not applied to Machines of War."}</p>
            {team.machine ? <ReferenceDetails label="Machine recommendation source"><p>{team.machine.note} <a href={team.machine.sourceUrl} target="_blank" rel="noreferrer">Recommendation source</a> · checked {team.machine.reviewedOn}.</p></ReferenceDetails> : null}
        </CollapsibleSection>
        <LaviscusRoadmap roster={roster} members={members} machine={machine ?? undefined}/>
    </>;
}
