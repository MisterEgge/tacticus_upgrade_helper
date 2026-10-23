"use client";
import CollapsibleSection from "../components/CollapsibleSection";
import type {DefenseEvidence,DefenseObservation} from "../../src/domain/warDefenseEvidence";
import RankBadge from "../components/RankBadge";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CharacterName, { CharacterPortrait } from "../components/CharacterName";
import ReferenceDetails from "../components/ReferenceDetails";
import FittedTeamName from "./FittedTeamName";
import { warGearLabel } from "../../src/domain/warGear";
import { uniqueWarTeamIndexes, chooseWarTeamForSlot, warSlotChoices, restoreWarTeamIndexes } from "../../src/domain/warTeams";
import { WAR_PLAN_STORAGE_KEY } from "../../src/domain/warBadgeTargets";
import {restoreWarMachines,warMachineAvailable} from "../../src/domain/warMachineSelection";

type Member={id:string;name:string;icon:string|undefined;rank:number|null;activeLevel:number|null;passiveLevel:number|null;items:Array<{slotId:string;rarity?:string;level:number;name?:string}>};
type Machine={id:string;name:string;active:number;passive:number};
type Team={tier?:"gold"|"silver";slot?:number;core?:string[];flex?:DefenseObservation[];confidence?:number;name:string;used:number;wins:number;evidence?:"core-flex"|undefined;members:Member[];fieldable:boolean;missing:string[]};
type Target=keyof typeof targets;
const targets={gold:{label:"Gold I · 35 / 35",rank:12,ability:35},silver:{label:"Silver I · 26 / 26",rank:9,ability:26}} as const;

export default function WarDefensePlanner({teams,offenseTeams,machines=[],defenseSource}:{teams:Team[];offenseTeams:Team[];machines?:Machine[];defenseSource?:Pick<DefenseEvidence,"scope"|"metric"|"importedAt">})
{
 const defense=useMemo(()=>teams.filter(team=>team.fieldable),[teams]),offense=useMemo(()=>offenseTeams.filter(team=>team.fieldable),[offenseTeams]);
 const [mode,setMode]=useState<"defense"|"offense">("defense");
 const [defenseSlots,setDefenseSlots]=useState(()=>uniqueWarTeamIndexes(defense,5));
 const [offenseSlots,setOffenseSlots]=useState(()=>uniqueWarTeamIndexes(offense,10));
 const [offenseTiers,setOffenseTiers]=useState<Target[]>(()=>Array(10).fill("silver"));
 const [open,setOpen]=useState<number|null>(null);
 const [defenseMachines,setDefenseMachines]=useState<Record<string,string>>({});
 const [restored,setRestored]=useState(false);
 useEffect(()=>{
    try{
        const saved=JSON.parse(window.localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null");
        if(saved&&typeof saved==="object"){
            setDefenseSlots(restoreWarTeamIndexes(defense,saved.defense,5));
            setOffenseSlots(restoreWarTeamIndexes(offense,saved.offense,10));
            if(Array.isArray(saved.offenseTiers)&&saved.offenseTiers.length===10&&saved.offenseTiers.every((tier:unknown)=>tier==="gold"||tier==="silver"))setOffenseTiers(saved.offenseTiers);
            setDefenseMachines(restoreWarMachines(saved.defenseMachines,defense.map(team=>team.name),new Set(machines.map(machine=>machine.id))));
            if(saved.mode==="offense")setMode("offense");
        }
    }catch{/* A malformed or unavailable browser store leaves the current defaults. */}
    setRestored(true);
 // Restore once for the roster loaded with this page; a fresh sync causes a new page load.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
    if(!restored)return;
    try{window.localStorage.setItem(WAR_PLAN_STORAGE_KEY,JSON.stringify({defense:defenseSlots.map(index=>defense[index]!.name),offense:offenseSlots.map(index=>offense[index]!.name),offenseTiers,defenseMachines,mode}));}catch{/* Planning still works if storage is blocked. */}
 },[restored,defenseSlots,offenseSlots,offenseTiers,defenseMachines,mode,defense,offense]);
 const detail=(team:Team,target:Target)=><div className="tableWrap"><table><thead><tr><th>Character</th><th>Rank</th><th>Abilities</th><th>Gear</th></tr></thead><tbody>{team.members.map(member=>{const goal=targets[target],rankGap=Math.max(0,goal.rank-(member.rank??0)),activeGap=Math.max(0,goal.ability-(member.activeLevel??0)),passiveGap=Math.max(0,goal.ability-(member.passiveLevel??0)),gear=warGearLabel(member.items,target);const abilityStatus=activeGap||passiveGap?[activeGap?"+" + activeGap + " active":"Active target met",passiveGap?"+" + passiveGap + " passive":"Passive target met"].join(" · "):"Target met";return <tr key={member.id}><td><Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link></td><td className={rankGap?"below":"ready"}>{member.rank===null?"Not owned":<RankBadge rank={member.rank}/>}<small>{rankGap?<>Target <RankBadge rank={goal.rank}/></>:"Target met"}</small></td><td className={activeGap||passiveGap?"below":"ready"}>{member.activeLevel??"?"} / {member.passiveLevel??"?"}<small>{abilityStatus}</small></td><td className={gear.ready?"ready":"below"}><strong>{gear.summary}</strong>{!gear.ready?<small>{gear.detail}</small>:null}</td></tr>})}</tbody></table></div>;
 const defensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><h2>{defense.length} distinct defense teams</h2><p className="sub">Battlefield 2 / Fortified Position / 2 Gold and 3 Silver lineups</p></div></div>
  <p className="sub">Follow-up holds, pooled across battlefields and buffs. Machine results are absent from this export; choose from your owned machines below.</p>
  {(["gold","silver"] as const).map(tier=><div key={tier}><h3><RankBadge rank={tier==="gold"?12:9}/></h3>{defense.filter(team=>team.tier===tier).map(team=><CollapsibleSection key={team.name} title={team.name} label={team.name} defaultOpen={false} summary={<>{team.used.toLocaleString()} core observations / {(team.wins/team.used*100).toFixed(1)}% holds</>}>
   <div className="warTeamPortraits" aria-label="Team characters">{team.members.map(member=><CharacterPortrait key={member.id} name={member.name} id={member.id} icon={member.icon}/>)}</div>
   <h3>Flex choices</h3><div className="tableWrap"><table><thead><tr><th>Character</th><th>Holds</th><th>Attempts</th></tr></thead><tbody>{team.flex?.map(flex=><tr key={flex.id}><td><CharacterName name={team.members.find(member=>member.id===flex.id)?.name??flex.id} id={flex.id}/></td><td>{(flex.wins/flex.used*100).toFixed(1)}%</td><td>{flex.used.toLocaleString()}</td></tr>)}</tbody></table></div>
   <label>Machine of War<select aria-label={team.name+" Machine of War"} value={defenseMachines[team.name]??""} onChange={event=>{const id=event.target.value;setDefenseMachines(current=>warMachineAvailable(current,team.name,id)?{...current,[team.name]:id}:current);}}><option value="">Choose a machine</option>{machines.map(machine=><option key={machine.id} value={machine.id} disabled={!warMachineAvailable(defenseMachines,team.name,machine.id)}>{machine.name} / {machine.active} / {machine.passive}{warMachineAvailable(defenseMachines,team.name,machine.id)?"":" / assigned to another team"}</option>)}</select></label>
   {detail(team,tier)}
  </CollapsibleSection>)}{defense.filter(team=>team.tier===tier).length<(tier==="gold"?2:3)?<p className="empty">Not enough owned, rank-qualified core and flex choices to fill {tier==="gold"?"two Gold":"three Silver"} teams from this snapshot.</p>:null}</div>)}
 </section>;
 const offensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">YOUR OFFENSE TEAMS</p><h2>{offenseSlots.length} distinct offense teams</h2><p className="sub">Swap teams or choose a compatible replacement. Targets stay with their slots.</p></div></div>{offenseSlots.map((choice,index)=>{const team=offense[choice],target=offenseTiers[index]??"silver",openKey=100+index;if(!team)return null;return <TeamSection key={index} label={`OFFENSE ${index+1}`} slotIndex={index} team={team} target={target} open={open===openKey} onOpen={()=>setOpen(open===openKey?null:openKey)} options={offense} choices={warSlotChoices(offense,offenseSlots,index)} choice={choice} onChoose={next=>setOffenseSlots(current=>chooseWarTeamForSlot(offense,current,index,next)??current)} onTarget={next=>setOffenseTiers(current=>current.map((tier,tierIndex)=>tierIndex===index?next:tier))} detail={detail(team,target)}/>})}</section>;
 return <><div className="abilityViews warModeTabs"><button className={mode==="defense"?"active":""} onClick={()=>setMode("defense")}>Defense teams</button><button className={mode==="offense"?"active":""} onClick={()=>setMode("offense")}>Offense teams</button></div>{mode==="defense"?defensePanel:offensePanel}<ReferenceDetails label="Team selection and source evidence">{defenseSource?<p>Imported {defenseSource.importedAt.slice(0,10)} / <Link href="https://tacticus.xyz/wars/analyze/defenders">TacticusXYZ defender source</Link></p>:null}<p>Defense and offense have separate sources and assignments. Each character appears once within each list. Defense ranks cores and individual flex choices using the 95% Wilson lower bound, so tiny perfect samples do not outrank well-supported results. The two chosen flex samples overlap; they are not added together or presented as a measured five-character win rate. Offense statistics belong to the exact recorded lineup.</p><p>The snapshot contains 20 displayed cores, with no Battlefield 2 or Fortified-only breakdown. Gold requires current Gold I rank or higher; Silver requires Silver I or higher. Ability and gear shortfalls appear inside each team. Machine selections are manual, not evidence-ranked. Your selections are saved in this browser. Defense uses five active slots; Gold targets 35/35 abilities and Silver targets 26/26.</p></ReferenceDetails></>;
}

function TeamSection({label,slotIndex,team,target,open,onOpen,options,choices,choice,onChoose,onTarget,detail}:{label:string;slotIndex:number;team:Team;target:Target;open:boolean;onOpen:()=>void;options:Team[];choices:ReturnType<typeof warSlotChoices>;choice:number;onChoose:(next:number)=>void;onTarget?:(next:Target)=>void;detail:React.ReactNode})
{
 return <div className="campaignInvestmentGroup"><button className="campaignSectionToggle warTeamToggle" aria-expanded={open} onClick={onOpen}><div className="warTeamHeaderMain"><p className="eyebrow">{label} · {targets[target].label}</p><FittedTeamName name={team.name}/><div className="warTeamPortraits" aria-label="Team characters">{team.members.map(member=><CharacterPortrait key={member.id} name={member.name} id={member.id} icon={member.icon}/>)}</div><p className="warSource">{team.evidence==="core-flex"?"Core observation":"Full lineup source"} · {team.used.toLocaleString()} uses · {(team.wins/team.used*100).toFixed(1)}% win</p></div><div className="campaignSectionStatus warTeamStatus"><select value={choice} aria-label={`${label} lineup alternative`} onClick={event=>event.stopPropagation()} onChange={event=>onChoose(Number(event.target.value))}><optgroup label={team.evidence==="core-flex"?"Distinct defense teams · swap positions":"Assigned offense teams · swap slots"}>{choices.assigned.map(({index,slot})=><option key={index} value={index}>{options[index]!.name} · {slot===slotIndex?"current":`swap with ${slot+1}`}</option>)}</optgroup>{choices.alternatives.length?<optgroup label="Unused compatible lineups · replace this slot">{choices.alternatives.map(index=><option key={index} value={index}>{options[index]!.name}</option>)}</optgroup>:null}</select>{onTarget?<select value={target} aria-label={`${label} target`} onClick={event=>event.stopPropagation()} onChange={event=>onTarget(event.target.value as Target)}>{Object.entries(targets).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select>:null}<span className="campaignChevron">{open?"▴":"▾"}</span></div></button>{open?<div className="campaignSectionBody">{detail}</div>:null}</div>;
}
