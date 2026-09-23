"use client";
import { useState } from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import { rankName } from "../../src/domain/ranks";
import { warGearLabel } from "../../src/domain/warGear";
import { uniqueWarTeamIndexes } from "../../src/domain/warTeams";

type Member={id:string;name:string;icon:string|undefined;rank:number|null;activeLevel:number|null;passiveLevel:number|null;items:Array<{slotId:string;rarity?:string;level:number;name?:string}>};
type Team={name:string;used:number;wins:number;members:Member[];fieldable:boolean;missing:string[]};
type Target=keyof typeof targets;
const targets={gold:{label:"Gold I · 35 / 35",rank:12,ability:35},silver:{label:"Silver I · 26 / 26",rank:9,ability:26}} as const;

export default function WarDefensePlanner({teams,offenseTeams}:{teams:Team[];offenseTeams:Team[]})
{
 const defense=teams.filter(team=>team.fieldable),offense=offenseTeams.filter(team=>team.fieldable);
 const [mode,setMode]=useState<"defense"|"offense">("defense");
 const [defenseSlots,setDefenseSlots]=useState(()=>uniqueWarTeamIndexes(defense,5));
 const [offenseSlots,setOffenseSlots]=useState(()=>uniqueWarTeamIndexes(offense,10));
 const [offenseTiers,setOffenseTiers]=useState<Target[]>(()=>Array(10).fill("silver"));
 const [open,setOpen]=useState<number|null>(null);
 const reflow=(available:Team[],slot:number,choice:number,count:number,current:number[])=>
 {
   const chosen=available[choice];if(!chosen)return current;
   const chosenNames=new Set(chosen.members.map(member=>member.name));
   const remainder=available.map((team,index)=>({team,index})).filter(({team,index})=>index!==choice&&!team.members.some(member=>chosenNames.has(member.name)));
   const picks=uniqueWarTeamIndexes(remainder.map(({team})=>team),count-1).map(index=>remainder[index]!.index);
   const next:number[]=[];let cursor=0;
   for(let index=0;index<Math.min(count,picks.length+1);index++)next.push(index===slot?choice:picks[cursor++]!);
   return next;
 };
 const detail=(team:Team,target:Target)=><div className="tableWrap"><table><thead><tr><th>Character</th><th>Rank</th><th>Abilities</th><th>Gear</th></tr></thead><tbody>{team.members.map(member=>{const goal=targets[target],rankGap=Math.max(0,goal.rank-(member.rank??0)),activeGap=Math.max(0,goal.ability-(member.activeLevel??0)),passiveGap=Math.max(0,goal.ability-(member.passiveLevel??0)),gear=warGearLabel(member.items);return <tr key={member.id}><td><Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link></td><td className={rankGap?"below":"ready"}>{member.rank===null?"Not owned":rankName(member.rank)}<small>{rankGap?`+${rankGap} → ${rankName(goal.rank)}`:"Met"}</small></td><td className={activeGap||passiveGap?"below":"ready"}>{member.activeLevel??"?"} / {member.passiveLevel??"?"}<small>{activeGap||passiveGap?`+${activeGap} active · +${passiveGap} passive`:"Met"}</small></td><td className={gear.ready?"ready":"below"}><strong>{gear.summary}</strong><small>{gear.detail}</small></td></tr>})}</tbody></table></div>;
 const defensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">YOUR FIVE DEFENSE SLOTS</p><h2>Select a team, then inspect it in place</h2><p className="sub">Slots 1–2 target Gold I / 35–35; slots 3–5 target Silver I / 26–26. Selecting a team automatically refills the other slots with the best distinct source teams.</p></div></div>{defenseSlots.map((choice,index)=>{const team=defense[choice],target:Target=index<2?"gold":"silver";if(!team)return null;return <TeamSection key={index} label={`DEFENSE ${index+1}`} team={team} target={target} open={open===index} onOpen={()=>setOpen(open===index?null:index)} options={defense} choice={choice} onChoose={next=>setDefenseSlots(current=>reflow(defense,index,next,5,current))} detail={detail(team,target)}/>})}</section>;
 const offensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">YOUR OFFENSE TEAMS</p><h2>Select a team, then inspect it in place</h2><p className="sub">The supplied source currently supports {offenseSlots.length} distinct owned offense teams. Each team’s target can be set to Silver I or Gold I.</p></div></div>{offenseSlots.map((choice,index)=>{const team=offense[choice],target=offenseTiers[index]??"silver",openKey=100+index;if(!team)return null;return <TeamSection key={index} label={`OFFENSE ${index+1}`} team={team} target={target} open={open===openKey} onOpen={()=>setOpen(open===openKey?null:openKey)} options={offense} choice={choice} onChoose={next=>setOffenseSlots(current=>reflow(offense,index,next,10,current))} onTarget={next=>setOffenseTiers(current=>current.map((tier,tierIndex)=>tierIndex===index?next:tier))} detail={detail(team,target)}/>})}</section>;
 const options=mode==="defense"?defense:offense;
 return <><div className="abilityViews warModeTabs"><button className={mode==="defense"?"active":""} onClick={()=>setMode("defense")}>Defense options</button><button className={mode==="offense"?"active":""} onClick={()=>setMode("offense")}>Offense options</button></div>{mode==="defense"?defensePanel:offensePanel}<section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">{mode.toUpperCase()} SOURCE OPTIONS</p><h2>Buildable five-character lineups</h2></div><div className="power">{options.length}<strong> options</strong></div></div>{options.map((team,index)=><div className="campaignInvestmentGroup" key={team.name}><h3>{index+1}. {team.name} · {team.used.toLocaleString()} uses · {(team.wins/team.used*100).toFixed(1)}% win</h3></div>)}</section></>;
}

function TeamSection({label,team,target,open,onOpen,options,choice,onChoose,onTarget,detail}:{label:string;team:Team;target:Target;open:boolean;onOpen:()=>void;options:Team[];choice:number;onChoose:(next:number)=>void;onTarget?:(next:Target)=>void;detail:React.ReactNode})
{
 return <div className="campaignInvestmentGroup"><button className="campaignSectionToggle" onClick={onOpen}><div><p className="eyebrow">{label} · {targets[target].label}</p><h2>{team.name}</h2><p className="warSource">Distinct source team</p></div><div className="campaignSectionStatus"><select value={choice} onClick={event=>event.stopPropagation()} onChange={event=>onChoose(Number(event.target.value))}>{options.map((option,index)=><option key={option.name} value={index}>{option.name}</option>)}</select>{onTarget?<select value={target} aria-label={`${label} target`} onClick={event=>event.stopPropagation()} onChange={event=>onTarget(event.target.value as Target)}>{Object.entries(targets).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select>:null}<span className="campaignChevron">{open?"▴":"▾"}</span></div></button>{open?<div className="campaignSectionBody">{detail}</div>:null}</div>;
}
