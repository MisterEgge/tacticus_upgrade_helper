"use client";
import type {OrbInventory} from "../../src/domain/orbPlanner";
import ViewTabs from "../components/ViewTabs";
import RankBadge from "../components/RankBadge";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReferenceDetails from "../components/ReferenceDetails";
import CollapsibleSection from "../components/CollapsibleSection";
import CharacterName from "../components/CharacterName";
import type { RaidTeam } from "../../src/domain/raidMeta";
import { raidCandidates, suggestedRaidLineup } from "../../src/domain/raidLineup";
import { RAID_MACHINES, raidMachinePlan, raidMythicNames, recommendedRaidMachine, suggestedRaidMachine } from "../../src/domain/raidMachine";
import { raidAbilityStep } from "../../src/domain/raidAbilityStep";
import { abilityTargetMet, formatAbilityTarget } from "../../src/domain/targetDisplay";
import { selectedRaidNames, type RaidSelection } from "../../src/domain/raidSelection";
import type { RosterUnit } from "../lib/report";
import LaviscusRoadmap from "./LaviscusRoadmap";
import RaidBattleGuide from "./RaidBattleGuide";
import RaidSideBossGuide from "./RaidSideBossGuide";

type Member = { name: string; id: string; icon?: string | undefined; owned: boolean; rarity: string | null; rank: number | null; xpLevel: number | null; activeLevel: number | null; passiveLevel: number | null; activeTarget: string; passiveTarget: string; activeBasis: string; passiveBasis: string };
type Team = RaidTeam & { members: Member[] };
type Teams = Record<string, Record<string, Team>>;

export default function GuildRaidPlanner({ teams, source, mainSelection, initialSelection=mainSelection, guildBoss, roster, orbInventory }: { teams: Teams; source: { sourceUrl: string; reviewedOn: string; note: string }; mainSelection: RaidSelection; initialSelection?:RaidSelection;guildBoss?:string|null;roster: RosterUnit[];orbInventory?:OrbInventory|null|undefined })
{
    const router = useRouter();
    const [boss, setBoss] = useState(initialSelection.boss);
    const [teamName, setTeamName] = useState(initialSelection.teamName);
    const [lineup, setLineup] = useState(selectedRaidNames(initialSelection, teams[initialSelection.boss]![initialSelection.teamName]!));
    const [autoFlex, setAutoFlex] = useState(initialSelection.autoFlex !== false);
    const ownedMachines = RAID_MACHINES.filter(machine => roster.some(unit => unit.id === machine.id));
    const machineNames = new Set<string>(ownedMachines.map(machine => machine.name));
    const [chosenMachine, setMachine] = useState(initialSelection.machine ?? null);
    const [autoMachine, setAutoMachine] = useState(initialSelection.autoMachine !== false);
    const [saved, setSaved] = useState(mainSelection);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [tab, setTab] = useState("Battle guide");
    const editFocus = useRef<HTMLSelectElement>(null);
    const focusEditor = useRef(false);
    const team = teams[boss]![teamName]!;
    const metaTeam = Object.keys(teams[boss]!)[0];
    const mythic = raidMythicNames(roster);
    const automaticMachine = suggestedRaidMachine(team,machineNames,lineup,mythic);
    const machine = autoMachine ? automaticMachine : chosenMachine;
    const suggested = suggestedRaidLineup(team);
    const recommendation = team.recommendation;
    const allowed = raidCandidates(team);
    const preferred = recommendation?.lineup.every(name=>allowed.includes(name)) ? recommendation.lineup : allowed.slice(0,5);
    const preferredMachine = recommendedRaidMachine(team);
    const selectedMachine = RAID_MACHINES.find(option => option.name === machine);
    const machineUnit = roster.find(unit => unit.id === selectedMachine?.id);
    const members = lineup.map(name => team.members.find(member => member.name === name)!).filter(Boolean);
    const flexSlot = lineup.findIndex(name=>!team.core.includes(name));
    useEffect(()=>{
        if(tab==="Team"&&focusEditor.current){
            editFocus.current?.focus();
            focusEditor.current=false;
        }
    },[tab]);
    const selection: RaidSelection = { boss, teamName, lineup, flex: lineup.filter(name => !team.core.includes(name)), autoFlex, machine, autoMachine };
    const isSaved = saved.boss === boss && saved.teamName === teamName
        && JSON.stringify(selectedRaidNames(saved, team)) === JSON.stringify(lineup)
        && (saved.autoFlex !== false) === autoFlex && saved.machine === machine && (saved.autoMachine !== false) === autoMachine;

    function chooseTeam(nextBoss: string, nextTeam: string)
    {
        const next = teams[nextBoss]![nextTeam]!;
        const previous=nextBoss===saved.boss&&nextTeam===saved.teamName?saved:null;
        setBoss(nextBoss); setTeamName(nextTeam);
        setLineup(previous?selectedRaidNames(previous,next):suggestedRaidLineup(next));
        setAutoFlex(previous?.autoFlex!==false);
        setMachine(previous?.machine??null);
        setAutoMachine(previous?.autoMachine!==false);
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

    return <div className="raidWorkspace">
        <section className="raidOverview panel" aria-label="Raid selection">
            <div className="raidOverviewControls abilityViews">
                <label>Raid boss<select value={boss} onChange={event => chooseTeam(event.target.value,event.target.value===saved.boss?saved.teamName:Object.keys(teams[event.target.value]!)[0]!)}>{Object.keys(teams).map(name => <option key={name}>{name}</option>)}</select></label>
                <label>Team Comp<select value={teamName} onChange={event => chooseTeam(boss, event.target.value)}>{Object.keys(teams[boss]!).map(name => <option key={name} value={name}>{name}{name===metaTeam?" · Meta":""}</option>)}</select></label>
            </div>
            {guildBoss?<p className="sub">Recent guild battle · {guildBoss}</p>:null}
            <div className="raidLineupStrip">{members.map(member=><CharacterName key={member.id} name={member.name} id={member.id} icon={member.icon}/>)}{selectedMachine?<CharacterName name={selectedMachine.name} id={selectedMachine.id}/>:null}</div>
            {lineup.length<5?<p role="status">Choose {5-lineup.length} more characters in Team.</p>:null}
            <div className="raidSave">
                {tab!=="Team"?<button type="button" onClick={()=>{focusEditor.current=true;setTab("Team");}}>Edit team</button>:null}
                <button type="button" onClick={saveMainTeam} disabled={saving || isSaved || lineup.length < 5}>{saving ? "Saving…" : isSaved ? "Main team saved" : "Set as main Raid team"}</button>
                {saveError ? <small role="alert">{saveError}</small> : null}
            </div>
        </section>
        <ViewTabs label="Guild Raid views" defaultTab="Battle guide" selectedTab={tab} onSelect={setTab} tabs={[
            {label:"Team",content:<>
        <section className="panel detailPanel raidTeamEditor">
            <div className="raidPreferredTeam" role="region" aria-label="Recommended team">
                <h2>Recommended team</h2>
                <p>{preferred.map(name=>team.members.find(member=>member.name===name)?.owned?name:`${name} (not owned)`).join(" · ")}{automaticMachine?<small>Recommended machine for your lineup · {automaticMachine}</small>:null}</p>
                {teamName==="Big Hit"||teamName==="Lavistodes"?<small>Lavistodes builds around Gulgortz as the fourth core member. Big Hit treats him as a flex choice. Both can recommend the same five.</small>:null}
            </div>
            <h2>Deploy this lineup</h2>
            <div className="abilityViews">
                {Array.from({ length: 5 }, (_, index) => <label key={index}>Character slot {index + 1}<select aria-label={`Character slot ${index+1}`} ref={index===(flexSlot<0?Math.min(4,lineup.length):flexSlot)?editFocus:undefined} value={lineup[index] ?? ""} onChange={event => {
                    const next = [...lineup]; next[Math.min(index, next.length)] = event.target.value; setLineup(next); setAutoFlex(false);
                }}>
                    {!lineup[index] ? <option value="">Insufficient owned substitutes</option> : null}
                    {raidCandidates(team).filter(name => !lineup.includes(name) || lineup[index] === name).map(name => <option key={name} value={name} disabled={!team.members.find(member => member.name === name)?.owned}>{name}{team.members.find(member => member.name === name)?.owned ? "" : " · not owned"}</option>)}
                </select>{lineup[index]?<small>{team.core.includes(lineup[index]!)?"Core":"Flex"}{members[index]?.rank!=null?<> · <RankBadge rank={members[index].rank}/></>:null}</small>:null}</label>)}
                <label>Machine of War<select value={machine ?? ""} onChange={event => { setMachine(event.target.value || null); setAutoMachine(false); }}>
                    <option value="">{machineNames.size?"No Machine of War":"No owned Machine of War"}</option>
                    {RAID_MACHINES.filter(option => !team.excludedMachines?.includes(option.name)).map(option => <option key={option.id} value={option.name} disabled={!machineNames.has(option.name)}>{option.name}{option.name === automaticMachine ? " · recommended" : ""}{machineNames.has(option.name) ? "" : " · not owned"}</option>)}
                </select></label>
            </div>
            <p className="raidTeamMachineNote">{machineUnit?<small>Primary {machineUnit.abilities[0]?.level ?? "unknown"} · Secondary {machineUnit.abilities[1]?.level ?? "unknown"}</small>:null}{machine?<><strong>{machine}</strong> · </>:null}{raidMachinePlan(machine,boss)}</p>
            {preferredMachine==="Plagueburst Crawler"&&automaticMachine!==preferredMachine&&machineNames.has(preferredMachine)?<p className="sub">The source suggests Plagueburst Crawler. Its damage support needs a Mythic Crawler and Mythic attackers.</p>:null}
            <div className="raidSave">
                <button type="button" onClick={() => { setLineup(suggested); setAutoFlex(true); setAutoMachine(true); }} disabled={autoFlex && autoMachine && JSON.stringify(lineup) === JSON.stringify(suggested)}>Use recommended owned team</button>

            </div>
            <div className="raidTeamSummary">
                <ReferenceDetails label="Meta source">
                    <p>{source.note} <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source: Tacticus Codex</a> · reviewed {source.reviewedOn}.</p>
                    {recommendation ? <p>Boss reference: {recommendation.lineup.join(" · ")} + {recommendation.machine}. <a href={recommendation.sourceUrl} target="_blank" rel="noreferrer">Terminus Maximus replay guide</a> · updated {recommendation.sourceUpdatedOn}, checked {recommendation.reviewedOn} · {recommendation.replays} replays. Character or machine substitutions do not inherit its measured performance.</p> : <p>No ranked exact five recorded for this core. Owned alternatives and substitutes form an assembled deployment lineup.</p>}
                    {team.fallbackNote ? <p>{team.fallbackNote}</p> : null}
                    {team.restrictionNote ? <p>{team.restrictionNote} <a href="https://tacticus.wiki.gg/wiki/Guild_Raid" target="_blank" rel="noreferrer">Boss faction restrictions</a>.</p> : null}
                </ReferenceDetails>
            </div>
        </section>
</>},
            {label:"Battle guide",content:<RaidBattleGuide key={`${boss}-${teamName}-${lineup.join("|")}-${machine}`} boss={boss} teamName={teamName} members={members} machine={machine}/>},
            {label:"Side bosses",content:<RaidSideBossGuide boss={boss}/>},
            {label:"Upgrades",content:<><LaviscusRoadmap roster={roster} members={members} machine={machine ?? undefined} orbInventory={orbInventory}/>
        <CollapsibleSection title="Character ability targets" defaultOpen={false} className="panel detailPanel">
            <p className="sub">Upgrade steps respect current XP and rarity. Check badges and coins before spending.</p>
            <div className="tableWrap"><table aria-label="Raid ability targets"><thead><tr><th>Character</th><th>Rank / level</th><th>Ability steps and targets</th></tr></thead><tbody>{members.map(member => <tr key={member.name}>
                <td><Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link><small>{team.core.includes(member.name) ? "Core" : team.flex.includes(member.name) ? "Flex" : "Substitute"}</small></td>
                <td>{member.rank === null ? "—" : <RankBadge rank={member.rank}/>}<small>Level {member.xpLevel ?? "—"}</small></td>
                <td><strong>Active {formatAbilityTarget(member.activeLevel, member.activeTarget)}</strong><small>{abilityTargetMet(member.activeLevel, member.activeTarget) ? null : raidAbilityStep(member.activeLevel, member.activeTarget, member.xpLevel, member.rarity)}</small>
                    <strong>Passive {formatAbilityTarget(member.passiveLevel, member.passiveTarget)}</strong><small>{abilityTargetMet(member.passiveLevel, member.passiveTarget) ? null : raidAbilityStep(member.passiveLevel, member.passiveTarget, member.xpLevel, member.rarity)}</small>
                    <ReferenceDetails label="Ability target basis"><p>Active: {member.activeBasis}</p><p>Passive: {member.passiveBasis}</p></ReferenceDetails></td>
            </tr>)}</tbody></table></div>
        </CollapsibleSection>

</>}
        ]}/>
    </div>;
}
