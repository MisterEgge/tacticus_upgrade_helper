"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CharacterName, { CharacterPortrait } from "../components/CharacterName";
import FittedTeamName from "./FittedTeamName";
import { rankName } from "../../src/domain/ranks";
import { warGearLabel } from "../../src/domain/warGear";
import { uniqueWarTeamIndexes, chooseWarTeamForSlot, warSlotChoices, restoreWarTeamIndexes } from "../../src/domain/warTeams";
import { WAR_PLAN_STORAGE_KEY } from "../../src/domain/warBadgeTargets";

type Member={id:string;name:string;icon:string|undefined;rank:number|null;activeLevel:number|null;passiveLevel:number|null;items:Array<{slotId:string;rarity?:string;level:number;name?:string}>};
type Team={name:string;used:number;wins:number;members:Member[];fieldable:boolean;missing:string[]};
type Target=keyof typeof targets;
const targets={gold:{label:"Gold I · 35 / 35",rank:12,ability:35},silver:{label:"Silver I · 26 / 26",rank:9,ability:26}} as const;

export default function WarDefensePlanner({teams,offenseTeams}:{teams:Team[];offenseTeams:Team[]})
{
 const defense=useMemo(()=>teams.filter(team=>team.fieldable),[teams]),offense=useMemo(()=>offenseTeams.filter(team=>team.fieldable),[offenseTeams]);
 const [mode,setMode]=useState<"defense"|"offense">("defense");
 const [defenseSlots,setDefenseSlots]=useState(()=>uniqueWarTeamIndexes(defense,5));
 const [offenseSlots,setOffenseSlots]=useState(()=>uniqueWarTeamIndexes(offense,10));
 const [offenseTiers,setOffenseTiers]=useState<Target[]>(()=>Array(10).fill("silver"));
 const [open,setOpen]=useState<number|null>(null);
 const [restored,setRestored]=useState(false);
 useEffect(()=>{
    try{
        const saved=JSON.parse(window.localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null");
        if(saved&&typeof saved==="object"){
            setDefenseSlots(restoreWarTeamIndexes(defense,saved.defense,5));
            setOffenseSlots(restoreWarTeamIndexes(offense,saved.offense,10));
            if(Array.isArray(saved.offenseTiers)&&saved.offenseTiers.length===10&&saved.offenseTiers.every((tier:unknown)=>tier==="gold"||tier==="silver"))setOffenseTiers(saved.offenseTiers);
            if(saved.mode==="offense")setMode("offense");
        }
    }catch{/* A malformed or unavailable browser store leaves the current defaults. */}
    setRestored(true);
 // Restore once for the roster loaded with this page; a fresh sync causes a new page load.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
    if(!restored)return;
    try{window.localStorage.setItem(WAR_PLAN_STORAGE_KEY,JSON.stringify({defense:defenseSlots.map(index=>defense[index]!.name),offense:offenseSlots.map(index=>offense[index]!.name),offenseTiers,mode}));}catch{/* Planning still works if storage is blocked. */}
 },[restored,defenseSlots,offenseSlots,offenseTiers,mode,defense,offense]);
 const detail=(team:Team,target:Target)=><div className="tableWrap"><table><thead><tr><th>Character</th><th>Rank</th><th>Abilities</th><th>Gear</th></tr></thead><tbody>{team.members.map(member=>{const goal=targets[target],rankGap=Math.max(0,goal.rank-(member.rank??0)),activeGap=Math.max(0,goal.ability-(member.activeLevel??0)),passiveGap=Math.max(0,goal.ability-(member.passiveLevel??0)),gear=warGearLabel(member.items,target);const abilityStatus=activeGap||passiveGap?[activeGap?"+" + activeGap + " active":"Active target met",passiveGap?"+" + passiveGap + " passive":"Passive target met"].join(" · "):"Target met";return <tr key={member.id}><td><Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link></td><td className={rankGap?"below":"ready"}>{member.rank===null?"Not owned":rankName(member.rank)}<small>{rankGap?`+${rankGap} → ${rankName(goal.rank)}`:"Target met"}</small></td><td className={activeGap||passiveGap?"below":"ready"}>{member.activeLevel??"?"} / {member.passiveLevel??"?"}<small>{abilityStatus}</small></td><td className={gear.ready?"ready":"below"}><strong>{gear.summary}</strong><small>{gear.detail}</small></td></tr>})}</tbody></table></div>;
 const defensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">YOUR FIVE DEFENSE SLOTS</p><h2>{defenseSlots.length} distinct defense teams</h2><p className="sub">Each character appears in one assigned defense team. Slots 1–2 target Gold I / 35–35; slots 3–5 target Silver I / 26–26. Select another assigned team to swap its slot and compare the upgrade targets. An unused compatible lineup replaces this slot only. Choices are saved in this browser.</p></div></div>{defenseSlots.map((choice,index)=>{const team=defense[choice],target:Target=index<2?"gold":"silver";if(!team)return null;return <TeamSection key={index} label={`DEFENSE ${index+1}`} slotIndex={index} team={team} target={target} open={open===index} onOpen={()=>setOpen(open===index?null:index)} options={defense} choices={warSlotChoices(defense,defenseSlots,index)} choice={choice} onChoose={next=>setDefenseSlots(current=>chooseWarTeamForSlot(defense,current,index,next)??current)} detail={detail(team,target)}/>})}</section>;
 const offensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">YOUR OFFENSE TEAMS</p><h2>{offenseSlots.length} distinct offense teams</h2><p className="sub">Swap assigned teams between slots or replace one slot with an unused compatible lineup. Each slot’s Silver I or Gold I target stays with the slot.</p></div></div>{offenseSlots.map((choice,index)=>{const team=offense[choice],target=offenseTiers[index]??"silver",openKey=100+index;if(!team)return null;return <TeamSection key={index} label={`OFFENSE ${index+1}`} slotIndex={index} team={team} target={target} open={open===openKey} onOpen={()=>setOpen(open===openKey?null:openKey)} options={offense} choices={warSlotChoices(offense,offenseSlots,index)} choice={choice} onChoose={next=>setOffenseSlots(current=>chooseWarTeamForSlot(offense,current,index,next)??current)} onTarget={next=>setOffenseTiers(current=>current.map((tier,tierIndex)=>tierIndex===index?next:tier))} detail={detail(team,target)}/>})}</section>;
 return <><div className="abilityViews warModeTabs"><button className={mode==="defense"?"active":""} onClick={()=>setMode("defense")}>Defense teams</button><button className={mode==="offense"?"active":""} onClick={()=>setMode("offense")}>Offense teams</button></div>{mode==="defense"?defensePanel:offensePanel}</>;
}

function TeamSection({label,slotIndex,team,target,open,onOpen,options,choices,choice,onChoose,onTarget,detail}:{label:string;slotIndex:number;team:Team;target:Target;open:boolean;onOpen:()=>void;options:Team[];choices:ReturnType<typeof warSlotChoices>;choice:number;onChoose:(next:number)=>void;onTarget?:(next:Target)=>void;detail:React.ReactNode})
{
 return <div className="campaignInvestmentGroup"><button className="campaignSectionToggle warTeamToggle" aria-expanded={open} onClick={onOpen}><div className="warTeamHeaderMain"><p className="eyebrow">{label} · {targets[target].label}</p><FittedTeamName name={team.name}/><div className="warTeamPortraits" aria-label="Team characters">{team.members.map(member=><CharacterPortrait key={member.id} name={member.name} id={member.id} icon={member.icon}/>)}</div><p className="warSource">Assigned team · source data {team.used.toLocaleString()} uses · {(team.wins/team.used*100).toFixed(1)}% win</p></div><div className="campaignSectionStatus warTeamStatus"><select value={choice} aria-label={`${label} lineup alternative`} onClick={event=>event.stopPropagation()} onChange={event=>onChoose(Number(event.target.value))}><optgroup label="Assigned teams · swap slots">{choices.assigned.map(({index,slot})=><option key={index} value={index}>{options[index]!.name} · {slot===slotIndex?"current":`swap with ${slot+1}`}</option>)}</optgroup>{choices.alternatives.length?<optgroup label="Unused compatible lineups · replace this slot">{choices.alternatives.map(index=><option key={index} value={index}>{options[index]!.name}</option>)}</optgroup>:null}</select>{onTarget?<select value={target} aria-label={`${label} target`} onClick={event=>event.stopPropagation()} onChange={event=>onTarget(event.target.value as Target)}>{Object.entries(targets).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select>:null}<span className="campaignChevron">{open?"▴":"▾"}</span></div></button>{open?<div className="campaignSectionBody">{detail}</div>:null}</div>;
}
