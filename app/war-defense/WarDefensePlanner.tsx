"use client";
import type {DefenseEvidence} from "../../src/domain/warDefenseEvidence";
import DefenseMachineSuggestion from "./DefenseMachineSuggestion";
import {recommendDefenseMachines} from "../../src/domain/warMachineRecommendations";
import DefenseDeployment from "./DefenseDeployment";
import {deploymentKey,restoreDeployments} from "../../src/domain/warDeployment";
import RankBadge from "../components/RankBadge";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CharacterPortrait } from "../components/CharacterName";
import ReferenceDetails from "../components/ReferenceDetails";
import WarUnitReadiness from "./WarUnitReadiness";
import { uniqueWarTeamIndexes, chooseWarTeamForSlot, warSlotChoices, restoreWarTeamIndexes, swapWarTeamSlots, distinctWarSlots } from "../../src/domain/warTeams";
import { WAR_PLAN_STORAGE_KEY } from "../../src/domain/warBadgeTargets";
import {restoreWarMachines,warMachineAvailable} from "../../src/domain/warMachineSelection";
import {warTierDefaultForRanks,warTierMinimumRank} from "../../src/domain/warReadiness";
import type {WarGearCap} from "../../src/domain/warGear";
import type {DragEvent,ReactNode} from "react";

type Member={traits?:readonly string[];faction?:string;id:string;name:string;icon:string|undefined;rank:number|null;rarity?:string|undefined;progressionIndex?:number|undefined;activeLevel:number|null;passiveLevel:number|null;items:Array<{slotId:string;id:string;rarity?:string;level:number;name?:string}>};
type Machine={id:string;name:string;active:number;passive:number;icon?:string|undefined;rank?:number|null;rarity?:string|undefined;progressionIndex?:number|undefined;activeLevel?:number|null;passiveLevel?:number|null;items?:Array<{slotId:string;id:string;rarity?:string;level:number;name?:string}>};
type FlexChoice={name?:string;id?:string;used:number;win?:number;wins?:number;member?:Member};
type Team={tier?:"gold"|"silver";slot?:number;core?:string[];flex?:FlexChoice[];confidence?:number;name:string;used:number;wins:number;evidence?:"core-flex"|undefined;members:Member[];fieldable:boolean;missing:string[]};
type Recommendation=Member&{score:number};
type UnlockTarget={id:string;name:string;icon?:string;evidence:"observed core"|"observed flex"|"exact five-character lineup";used:number;win:number;campaigns:string[];shops:Array<{shop:string;rotation:string;price:string}>};
type GoldBuildTeam={core:string[];members:Member[];used:number;wins:number;flex:Array<{id:string;used:number;wins:number}>;rankGap:number};
type GoldBuildCharacter={rank:number;used:number;wins:number;evidence:"core"|"flex";member:Member};
type GoldBuildTargets={teams:GoldBuildTeam[];characters:GoldBuildCharacter[]};
const teamCoreMembers=(team:Team)=>team.members.filter(member=>team.core?.includes(member.id)||team.core?.includes(member.name));
const teamFlexChoices=(team:Team)=>team.flex?.flatMap(candidate=>{
 const name=candidate.name??candidate.id,member=candidate.member??team.members.find(value=>value.id===name||value.name===name);
 return name&&member?[{candidate,member}]:[];
})??[];
const teamMembersForFlex=(team:Team,selectedIds:string[])=>{
 const core=teamCoreMembers(team),flex=selectedIds.flatMap(id=>teamFlexChoices(team).find(choice=>choice.member.id===id)?.member??[]);
 return [...core,...flex].slice(0,5);
};
const defaultDefenseSlots=(teams:Team[]):Array<number|null>=>{
 const slots:Array<number|null>=Array(5).fill(null),used=new Set<number>();
 for(const [index,team] of teams.entries())if(team.slot!==undefined&&team.slot>=0&&team.slot<5&&slots[team.slot]===null){slots[team.slot]=index;used.add(index);}
 for(const tier of ["gold","silver"] as const){
  const tierSlots=tier==="gold"?[0,1]:[2,3,4];
  for(const [index,team] of teams.entries())if(!used.has(index)&&team.tier===tier){
   const empty=tierSlots.find(slot=>slots[slot]===null);
   if(empty!==undefined){slots[empty]=index;used.add(index);}
  }
 }
 for(const index of uniqueWarTeamIndexes(teams,5))if(!used.has(index)){
  const empty=slots.findIndex(slot=>slot===null);
  if(empty>=0){slots[empty]=index;used.add(index);}
 }
 return slots;
};
const restoreDefenseSlots=(teams:Team[],saved:unknown):Array<number|null>=>{
 const defaults=defaultDefenseSlots(teams);
 if(!Array.isArray(saved))return defaults;
 if(saved.length===5&&saved.every(value=>value===null||typeof value==="string")){
  const indexes=saved.map(name=>name===null?null:teams.findIndex(team=>team.name===name));
  const chosen=indexes.filter((index):index is number=>index!==null);
  if(chosen.every(index=>index>=0)&&new Set(chosen).size===chosen.length&&distinctWarSlots(teams,chosen))return indexes;
 }
 const legacy=restoreWarTeamIndexes(teams,saved,5),slots:Array<number|null>=Array(5).fill(null),used=new Set<number>();
 for(const index of legacy){
  const team=teams[index]!;
  const preferred=team.slot;
  const tierSlots=team.tier==="gold"?[0,1]:[2,3,4];
  const slot=preferred!==undefined&&slots[preferred]===null?preferred:tierSlots.find(value=>slots[value]===null);
  if(slot!==undefined){slots[slot]=index;used.add(index);}
 }
 for(const index of legacy)if(!used.has(index)){
  const empty=slots.findIndex(value=>value===null);
  if(empty>=0){slots[empty]=index;used.add(index);}
 }
 return slots;
};
export default function WarDefensePlanner({teams,offenseTeams,machines=[],recommendedUnits=[],unlockTargets=[],goldBuildTargets,counterGuide,defenseSource}:{teams:Team[];offenseTeams:Team[];machines?:Machine[];recommendedUnits?:Recommendation[];unlockTargets?:UnlockTarget[];goldBuildTargets?:GoldBuildTargets;counterGuide?:ReactNode;defenseSource?:Pick<DefenseEvidence,"scope"|"metric"|"importedAt">})
{
 const defense=useMemo(()=>teams.filter(team=>team.fieldable),[teams]),offense=useMemo(()=>offenseTeams.filter(team=>team.fieldable),[offenseTeams]);
 const [mode,setMode]=useState<"defense"|"offense"|"counters">("defense");
 const [defenseSlots,setDefenseSlots]=useState<Array<number|null>>(()=>defaultDefenseSlots(defense));
 const [offenseSlots,setOffenseSlots]=useState(()=>uniqueWarTeamIndexes(offense,10));
 const [defenseMachines,setDefenseMachines]=useState<Record<string,string>>({});
 const [defenseOrders,setDefenseOrders]=useState<Record<string,string[]>>({});
 const [defenseFlex,setDefenseFlex]=useState<Record<string,string[]>>({});
 const [offenseMachines,setOffenseMachines]=useState<Record<string,string>>({});
 const [offenseFlex,setOffenseFlex]=useState<Record<string,string[]>>({});
 const [offenseTargets,setOffenseTargets]=useState<Record<string,WarGearCap>>(()=>Object.fromEntries(offense.map(team=>[team.name,warTierDefaultForRanks(team.members.map(member=>member.rank))])));
 const [offenseOrders,setOffenseOrders]=useState<Record<string,string[]>>({});
 const defenseInSlots=defenseSlots.flatMap((choice,index)=>{
  const team=choice===null?undefined:defense[choice];
  return team?[{...team,tier:index<2?"gold" as const:"silver" as const,slot:index}]:[];
 });
 const goldSlotsOpen=Math.max(0,2-defenseInSlots.filter(team=>team.tier==="gold").length);
 const machineSuggestions=useMemo(()=>recommendDefenseMachines(defenseInSlots,machines,defenseMachines),[defenseInSlots,machines,defenseMachines]);
 const [restored,setRestored]=useState(false);
 useEffect(()=>{
    try{
        const saved=JSON.parse(window.localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null");
        if(saved&&typeof saved==="object"){
            setDefenseSlots(restoreDefenseSlots(defense,saved.defense));
            setOffenseSlots(restoreWarTeamIndexes(offense,saved.offense,10));
            const validDefenseFlex:Record<string,string[]>={};
            if(saved.defenseFlex&&typeof saved.defenseFlex==="object"&&!Array.isArray(saved.defenseFlex)){
                for(const [name,ids] of Object.entries(saved.defenseFlex))if(Array.isArray(ids)&&ids.length===2&&new Set(ids).size===2&&defense.some(team=>team.name===name)&&ids.every(id=>typeof id==="string"&&defense.find(team=>team.name===name)?.flex?.some(candidate=>candidate.member?.id===id||candidate.id===id)))validDefenseFlex[name]=ids as string[];
                setDefenseFlex(validDefenseFlex);
            }
            setDefenseOrders(restoreDeployments(saved.defenseOrders,defense.map(team=>teamMembersForFlex(team,validDefenseFlex[team.name]??team.members.filter(member=>!teamCoreMembers(team).some(core=>core.id===member.id)).map(member=>member.id)).map(member=>member.id))));
            setOffenseOrders(restoreDeployments(saved.offenseOrders,offense.map(team=>team.members.map(member=>member.id))));
            setDefenseMachines(restoreWarMachines(saved.defenseMachines,defense.map(team=>team.name),new Set(machines.map(machine=>machine.id))));
            if(saved.offenseMachines&&typeof saved.offenseMachines==="object"&&!Array.isArray(saved.offenseMachines)){
                const owned=new Set(machines.map(machine=>machine.id));
                const validMachines:Record<string,string>={};
                for(const [team,id] of Object.entries(saved.offenseMachines))if(typeof id==="string"&&offense.some(option=>option.name===team)&&owned.has(id))validMachines[team]=id;
                setOffenseMachines(validMachines);
            }
            if(saved.offenseTargets&&typeof saved.offenseTargets==="object"&&!Array.isArray(saved.offenseTargets)){
                const validTargets:Record<string,WarGearCap>={};
                for(const [team,tier] of Object.entries(saved.offenseTargets))if((tier==="gold"||tier==="silver")&&offense.some(option=>option.name===team))validTargets[team]=tier;
                setOffenseTargets(current=>({...current,...validTargets}));
            }
            if(saved.offenseFlex&&typeof saved.offenseFlex==="object"&&!Array.isArray(saved.offenseFlex)){
                const validFlex:Record<string,string[]>={};
                for(const [team,names] of Object.entries(saved.offenseFlex))if(Array.isArray(names)&&names.length===2&&new Set(names).size===2&&offense.some(option=>option.name===team)&&names.every(name=>typeof name==="string"&&offense.find(option=>option.name===team)?.flex?.some(candidate=>(candidate.name??candidate.id)===name)))validFlex[team]=names as string[];
                setOffenseFlex(validFlex);
            }
            if(saved.mode==="offense"||saved.mode==="counters")setMode(saved.mode);
        }
    }catch{/* A malformed or unavailable browser store leaves the current defaults. */}
    setRestored(true);
 // Restore once for the roster loaded with this page; a fresh sync causes a new page load.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
    if(!restored)return;
    try{window.localStorage.setItem(WAR_PLAN_STORAGE_KEY,JSON.stringify({version:3,defense:defenseSlots.map(index=>index===null?null:defense[index]!.name),offense:offenseSlots.map(index=>offense[index]!.name),defenseMachines,defenseOrders,defenseFlex,offenseMachines,offenseTargets,offenseFlex,offenseOrders,mode}));}catch{/* Planning still works if storage is blocked. */}
 },[restored,defenseSlots,offenseSlots,defenseMachines,defenseOrders,defenseFlex,offenseMachines,offenseTargets,offenseFlex,offenseOrders,mode,defense,offense]);
 const moveDefenseTeam=(from:number,to:number)=>setDefenseSlots(current=>swapWarTeamSlots(current,from,to)??current);
 const dropDefenseTeam=(event:DragEvent<HTMLElement>,to:number)=>{
  event.preventDefault();
  const value=event.dataTransfer.getData("text/plain"),from=Number(value);
  if(value&&Number.isInteger(from))moveDefenseTeam(from,to);
 };
 const defensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><h2>{defense.length} defense teams</h2><p className="sub">Battlefield 2 / Fortified Position · first 2 slots Gold, next 3 Silver.</p></div></div>
  <p className="sub">Drag a team card to another slot to change its target tier. The slot determines the Gold/Silver readiness checks; moving teams does not alter source performance evidence.</p>
  {Object.keys(machineSuggestions).length?<div className="warMachineActions"><button className="warMachineApply" type="button" onClick={()=>setDefenseMachines(current=>({...current,...Object.fromEntries(Object.entries(machineSuggestions).map(([team,fit])=>[team,fit.id]))}))}>Fill unassigned machines</button></div>:null}
  <div className="warDefenseSlots">{Array.from({length:5},(_,index)=>{
   const choice=defenseSlots[index],team=choice===null||choice===undefined?undefined:defense[choice],tier=index<2?"gold" as const:"silver" as const;
   if(!team)return <section className="warDefenseCard warDefenseEmptySlot" key={`empty-${index}`} aria-label={`Team slot ${index+1}, ${tier}`} onDragOver={event=>event.preventDefault()} onDrop={event=>dropDefenseTeam(event,index)}><span>Team {index+1}</span><RankBadge rank={tier==="gold"?12:9}/><p>Open slot · no complete owned lineup available.</p></section>;
   const teamNumber=index+1,coreMembers=teamCoreMembers(team);
   const defaultFlex=team.members.filter(member=>!coreMembers.some(core=>core.id===member.id)).map(member=>member.id);
   const selectedFlexIds=defenseFlex[team.name]??defaultFlex;
   const members=teamMembersForFlex(team,selectedFlexIds);
   const flexChoices=teamFlexChoices(team).filter(({member})=>!coreMembers.some(core=>core.id===member.id));
   const rankFloor=warTierMinimumRank(tier);
   const qualifiedFlex=flexChoices.filter(({member})=>member.rank!==null&&member.rank>=rankFloor);
   const underRankFlex=flexChoices.filter(({member})=>member.rank===null||member.rank<rankFloor);
   const lineupKey=deploymentKey(members.map(member=>member.id));
   const replaceFlex=(memberId:string)=>{
    const nextFlexIds=[...selectedFlexIds.slice(1),memberId],nextMembers=teamMembersForFlex(team,nextFlexIds);
    const nextKey=deploymentKey(nextMembers.map(member=>member.id));
    setDefenseFlex(current=>({...current,[team.name]:nextFlexIds}));
    setDefenseOrders(current=>{
     const oldOrder=current[lineupKey]??members.map(member=>member.id);
     const nextIds=nextMembers.map(member=>member.id),preserved=oldOrder.filter(id=>nextIds.includes(id));
     return {...current,[nextKey]:[...preserved,...nextIds.filter(id=>!preserved.includes(id))]};
    });
   };
   return <section className="warDefenseCard warDefenseSlot" key={team.name} aria-label={team.name} onDragOver={event=>event.preventDefault()} onDrop={event=>dropDefenseTeam(event,index)}>
    <div className="warDefenseSlotControls"><strong>Team {teamNumber}</strong><RankBadge rank={tier==="gold"?12:9}/><button type="button" className="warDefenseDragHandle" draggable aria-label={`Drag Team ${teamNumber} to another slot`} title="Drag to reorder" onDragStart={event=>{event.dataTransfer.setData("text/plain",String(index));event.dataTransfer.effectAllowed="move";}}>⠿</button><button type="button" aria-label={`Move Team ${teamNumber} earlier`} disabled={index===0} onClick={()=>moveDefenseTeam(index,index-1)}>↑</button><button type="button" aria-label={`Move Team ${teamNumber} later`} disabled={index===defenseSlots.length-1} onClick={()=>moveDefenseTeam(index,index+1)}>↓</button></div>
    <details className="warCollapsibleTeam">
     <summary className="warCollapsibleSummary" aria-label={`Team ${teamNumber}, ${tier}, ${members.map(member=>member.name).join(", ")}`}>
      <span className="warCollapsibleTitle">Team {teamNumber}</span>
      <span className="warTeamPortraits">{members.map(member=><CharacterPortrait key={member.id} id={member.id} name={member.name} icon={member.icon}/>)}</span>
      <span className="warTeamSummaryStats"><strong>{(team.wins/team.used*100).toFixed(1)}%</strong> core defense / {team.used.toLocaleString()} attacks</span>
     </summary>
     <div className="warCollapsibleBody">
      <p className="warOffenseEvidence">Observed three-character core: {team.used.toLocaleString()} attacks · {(team.wins/team.used*100).toFixed(1)}% holds. This is not a measured result for the five-character lineup.</p>
      <div className="warOffenseGroups warDefenseGroups">
       <section className="warOffenseGroup"><h4>Core 3</h4><div className="warOffenseCandidates">{coreMembers.map(member=><article key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><WarUnitReadiness unit={member} tier={tier}/></article>)}</div></section>
       <section className="warOffenseGroup"><h4>Flex · rank matched</h4><div className="warOffenseCandidates">{qualifiedFlex.map(({candidate,member})=><article key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><WarUnitReadiness unit={member} tier={tier}/><small>{candidate.used.toLocaleString()} holds · {(candidate.win??((candidate.wins??0)/candidate.used*100)).toFixed(1)}% hold rate</small><button type="button" disabled={selectedFlexIds.includes(member.id)} onClick={()=>replaceFlex(member.id)}>{selectedFlexIds.includes(member.id)?"Selected":"Use flex"}</button></article>)}</div>{qualifiedFlex.length===0?<p className="sub">No owned, available flex units currently meet this rank.</p>:null}</section>
       <section className="warOffenseGroup below"><h4>Flex · below target rank</h4><div className="warOffenseCandidates">{underRankFlex.map(({candidate,member})=><article key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><WarUnitReadiness unit={member} tier={tier}/><small>{candidate.used.toLocaleString()} holds · {(candidate.win??((candidate.wins??0)/candidate.used*100)).toFixed(1)}% hold rate</small><button type="button" disabled={selectedFlexIds.includes(member.id)} onClick={()=>replaceFlex(member.id)}>{selectedFlexIds.includes(member.id)?"Selected":"Use anyway"}</button></article>)}</div>{underRankFlex.length===0?<p className="sub">No below-rank owned flex candidates in this source.</p>:null}</section>
      </div>
      <div className="warDefenseLayout"><DefenseDeployment members={members} tier={tier} saved={defenseOrders[lineupKey]} onChange={ids=>setDefenseOrders(current=>({...current,[lineupKey]:ids}))}/>
       <div className="warDefenseMachine">
        <DefenseMachineSuggestion team={{...team,tier}} machines={machines} selected={defenseMachines[team.name]} suggestion={machineSuggestions[team.name]} onChoose={id=>setDefenseMachines(current=>warMachineAvailable(current,team.name,id)?{...current,[team.name]:id}:current)}/>
        <details className="warMachineChange"><summary>Change machine</summary><select aria-label={team.name+" Machine of War"} value={defenseMachines[team.name]??""} onChange={event=>{const id=event.target.value;setDefenseMachines(current=>warMachineAvailable(current,team.name,id)?{...current,[team.name]:id}:current);}}><option value="">Choose a machine</option>{machines.map(machine=><option key={machine.id} value={machine.id} disabled={!warMachineAvailable(defenseMachines,team.name,machine.id)}>{machine.name} / {machine.active} / {machine.passive}{warMachineAvailable(defenseMachines,team.name,machine.id)?"":" / assigned to another team"}</option>)}</select></details>
       </div>
      </div>
     </div>
    </details>
   </section>;
  })}</div>
  {goldSlotsOpen>0?goldBuildTargets?<section className="warGoldBuildPanel" aria-label="Build toward Gold">
   <h4>Build toward Gold · {goldSlotsOpen} slot{goldSlotsOpen===1?"":"s"} open</h4>
   <p className="sub">These owned, source-backed options are not Gold-ready yet unless marked so. Rank badges show who to build to Gold I; source rates describe the observed core or individual flex, not the five-character lineup.</p>
   {goldBuildTargets.teams.slice(0,goldSlotsOpen).map((build,index)=>{
    const core=build.members.filter(member=>build.core.includes(member.id)||build.core.includes(member.name)),flex=build.members.filter(member=>!core.some(unit=>unit.id===member.id));
    return <article className="warGoldBuildTeam" key={build.members.map(member=>member.id).join("|")}>
     <div className="warGoldBuildHeading"><strong>Potential Gold team {index+1}</strong><span>{build.used.toLocaleString()} core attacks · {(build.wins/build.used*100).toFixed(1)}% holds</span></div>
     <div className="warGoldBuildGroups"><section><h5>Core 3</h5><div className="warGoldBuildMembers">{core.map(member=><div className="warGoldBuildMember" key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><span className={member.rank!==null&&member.rank>=12?"warGoldBuildReady":"warGoldBuildNeeds"}>{member.rank!==null&&member.rank>=12?"Gold I ready":"Build to Gold I"}</span><WarUnitReadiness unit={member} tier="gold"/></div>)}</div></section>
      <section><h5>Flex 2</h5><div className="warGoldBuildMembers">{flex.map(member=>{const evidence=build.flex.find(candidate=>candidate.id===member.id);return <div className="warGoldBuildMember" key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><span className={member.rank!==null&&member.rank>=12?"warGoldBuildReady":"warGoldBuildNeeds"}>{member.rank!==null&&member.rank>=12?"Gold I ready":"Build to Gold I"}</span><WarUnitReadiness unit={member} tier="gold"/>{evidence?<small>{evidence.used.toLocaleString()} holds · {(evidence.wins/evidence.used*100).toFixed(1)}% flex hold rate</small>:null}</div>;})}</div></section></div>
    </article>;
   })}
   {goldBuildTargets.teams.length<goldSlotsOpen&&goldBuildTargets.characters.length?<section className="warGoldBuildCharacterList"><h5>Other owned characters to work on</h5><div className="warOffenseCandidates">{goldBuildTargets.characters.slice(0,8).map(target=><article key={target.member.id}><Link href={`/characters/${target.member.id}`} className="warDefenseCharacter"><CharacterPortrait id={target.member.id} name={target.member.name} icon={target.member.icon}/><strong>{target.member.name}</strong></Link><WarUnitReadiness unit={target.member} tier="gold"/><small className={target.rank>=12?"warGoldBuildReady":"warGoldBuildNeeds"}>{target.rank>=12?"Gold I ready":"Build to Gold I"} · {target.evidence==="core"?"observed core":"observed flex"}</small><small>{target.used.toLocaleString()} {target.evidence==="core"?"attacks":"holds"} · {(target.wins/target.used*100).toFixed(1)}%</small></article>)}</div></section>:null}
   {goldBuildTargets.teams.length===0&&goldBuildTargets.characters.length===0?<p className="sub">No unassigned owned characters from these source lineups can currently fill the gap. Reassess defense assignments or unlock more source-team members.</p>:null}
  </section>:null:null}
 </section>;
 const assignedCharacterNames=new Set([
  ...defenseSlots.flatMap(choice=>choice===null?[]:defense[choice]?.members.map(member=>member.name)??[]),
  ...offenseSlots.flatMap(choice=>{
   const team=offense[choice];if(!team)return [];
   const core=team.core??team.members.map(member=>member.name);
   return [...core,...(offenseFlex[team.name]??team.members.filter(member=>!core.includes(member.name)).map(member=>member.name))];
  })
 ]);
 const availableRecommendations=recommendedUnits.filter(unit=>!assignedCharacterNames.has(unit.name));
 const offensePanel=<section className="panel detailPanel"><div className="sectionTitle"><div><h2>{offenseSlots.length} offense teams</h2><p className="sub">Character ranks, ability caps, equipped gear, and a Machine of War are shown for each lineup.</p></div></div>
  {offenseSlots.map((choice,index)=>{const team=offense[choice];if(!team)return null;
   const teamKey=team.name,machine=machines.find(value=>value.id===offenseMachines[teamKey]),targetTier=offenseTargets[teamKey]??warTierDefaultForRanks(team.members.map(member=>member.rank));
   const coreIds=team.core??team.members.map(member=>member.id),coreMembers=team.members.filter(member=>coreIds.includes(member.name)||coreIds.includes(member.id));
   const fallbackFlex=team.members.filter(member=>!coreMembers.some(core=>core.id===member.id)).map(member=>member.name);
   const selectedFlexNames=offenseFlex[teamKey]??fallbackFlex;
   const selectedFlex=selectedFlexNames.flatMap(name=>{const member=team.members.find(value=>value.name===name)||recommendedUnits.find(value=>value.name===name);return member?[member]:[];});
   const members=[...coreMembers,...selectedFlex].slice(0,5);
   const lineupChoices=warSlotChoices(offense,offenseSlots,index);
   const deployment=deploymentKey(members.map(member=>member.id));
   const otherAssigned=new Set(offenseSlots.flatMap((option,slot)=>{
    if(slot===index)return [];
    const assignedTeam=offense[option]!,assignedCore=assignedTeam.core??assignedTeam.members.map(member=>member.name);
    return [...assignedCore,...(offenseFlex[assignedTeam.name]??assignedTeam.members.filter(member=>!assignedCore.includes(member.name)).map(member=>member.name))];
   }));
   const flexChoices=(team.flex??[]).flatMap(candidate=>{const name=candidate.name??candidate.id;if(!name)return [];const member=candidate.member??(team.members.find(value=>value.name===name)||recommendedUnits.find(value=>value.name===name));return member&&!otherAssigned.has(name)&&!coreMembers.some(core=>core.name===name)?[{candidate,member}]:[];});
   const rankFloor=warTierMinimumRank(targetTier);
   const qualifiedFlex=flexChoices.filter(({member})=>member.rank!==null&&member.rank>=rankFloor);
   const underRankFlex=flexChoices.filter(({member})=>member.rank===null||member.rank<rankFloor);
   return <section className="warDefenseCard" key={index} aria-label={`Offense team ${index+1}`}>
    <details className="warCollapsibleTeam">
     <summary className="warCollapsibleSummary" aria-label={`Offense team ${index+1}, ${targetTier} target, ${members.map(member=>member.name).join(", ")}`}>
      <span className="warCollapsibleTitle">Offense {index+1}</span>
      <span className="warTargetTier warTargetTierPreview"><RankBadge rank={targetTier==="gold"?12:9} decorative/></span>
      <span className="warTeamPortraits">{members.map(member=><CharacterPortrait key={member.id} id={member.id} name={member.name} icon={member.icon}/>)}</span>
      <span className="warTeamSummaryStats">{team.evidence==="core-flex"?`${team.used.toLocaleString()} core uses · ${(team.wins/team.used*100).toFixed(1)}% wins`:`${team.used.toLocaleString()} uses · ${(team.wins/team.used*100).toFixed(1)}% wins`}</span>
     </summary>
     <div className="warCollapsibleBody">
    <header className="warDefenseCardHeader"><h3>Offense {index+1}</h3><div className="warOffenseControls">
     <button type="button" className="warTargetTier" aria-label={`Offense ${index+1} targets ${targetTier} defense. Change target tier`} title={`Targeting ${targetTier} defense`} onClick={()=>setOffenseTargets(current=>({...current,[teamKey]:targetTier==="gold"?"silver":"gold"}))}><RankBadge rank={targetTier==="gold"?12:9}/></button>
     <details className="warLineupChange"><summary>Change lineup</summary><select aria-label={`Offense ${index+1} lineup`} value={choice} onChange={event=>setOffenseSlots(current=>chooseWarTeamForSlot(offense,current,index,Number(event.target.value))??current)}>
      <optgroup label="Assigned teams">{lineupChoices.assigned.map(({index:optionIndex,slot})=><option key={optionIndex} value={optionIndex}>Offense {slot+1}: {offense[optionIndex]!.members.map(member=>member.name).join(" / ")}</option>)}</optgroup>
      {lineupChoices.alternatives.length?<optgroup label="Unused lineups">{lineupChoices.alternatives.map(optionIndex=><option key={optionIndex} value={optionIndex}>{offense[optionIndex]!.members.map(member=>member.name).join(" / ")}</option>)}</optgroup>:null}
     </select></details>
    </div></header>
    {team.evidence==="core-flex"?<p className="warOffenseEvidence">Observed three-character core: {team.used.toLocaleString()} uses · {(team.wins/team.used*100).toFixed(1)}% wins. This is not a measured result for the five-character lineup.</p>:<p className="warOffenseEvidence">Observed exact five-character lineup: {team.used.toLocaleString()} uses · {(team.wins/team.used*100).toFixed(1)}% wins.</p>}
    <div className="warOffenseGroups">
     <section className="warOffenseGroup"><h4>{coreMembers.length===3?"Core 3":`Recorded lineup · ${coreMembers.length}`}</h4><div className="warOffenseCandidates">{coreMembers.map(member=><article key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><WarUnitReadiness unit={member} tier={targetTier}/></article>)}</div></section>
     <section className="warOffenseGroup"><h4>Flex · rank matched</h4><div className="warOffenseCandidates">{qualifiedFlex.map(({candidate,member})=><article key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><WarUnitReadiness unit={member} tier={targetTier}/><small>{candidate.used.toLocaleString()} uses · {(candidate.win??((candidate.wins??0)/candidate.used*100)).toFixed(1)}% core win rate</small><button type="button" disabled={selectedFlexNames.includes(member.name)} onClick={()=>setOffenseFlex(current=>({...current,[teamKey]:[...selectedFlexNames.slice(1),member.name]}))}>{selectedFlexNames.includes(member.name)?"Selected":"Use flex"}</button></article>)}</div>{qualifiedFlex.length===0?<p className="sub">No owned, available flex units currently meet this target rank.</p>:null}</section>
     <section className="warOffenseGroup below"><h4>Flex · below target rank</h4><div className="warOffenseCandidates">{underRankFlex.map(({candidate,member})=><article key={member.id}><Link href={`/characters/${member.id}`} className="warDefenseCharacter"><CharacterPortrait id={member.id} name={member.name} icon={member.icon}/><strong>{member.name}</strong></Link><WarUnitReadiness unit={member} tier={targetTier}/><small>{candidate.used.toLocaleString()} uses · {(candidate.win??((candidate.wins??0)/candidate.used*100)).toFixed(1)}% core win rate</small><button type="button" disabled={selectedFlexNames.includes(member.name)} onClick={()=>setOffenseFlex(current=>({...current,[teamKey]:[...selectedFlexNames.slice(1),member.name]}))}>{selectedFlexNames.includes(member.name)?"Selected":"Use anyway"}</button></article>)}</div>{underRankFlex.length===0?<p className="sub">No under-rank owned flex candidates in this source.</p>:null}</section>
    </div>
    <div className="warDefenseLayout">
     <details className="warOffenseDeployment"><summary>Deployment order · 5 units</summary><DefenseDeployment mode="offense" members={members} tier={targetTier} saved={offenseOrders[deployment]} onChange={ids=>setOffenseOrders(current=>({...current,[deployment]:ids}))}/></details>
     <div className="warDefenseMachine warOffenseMachine">
      <label htmlFor={`offense-machine-${index}`}>Machine of War</label>
      <select id={`offense-machine-${index}`} aria-label={`Offense ${index+1} Machine of War`} value={offenseMachines[teamKey]??""} onChange={event=>setOffenseMachines(current=>{const next={...current};if(event.target.value)next[teamKey]=event.target.value;else delete next[teamKey];return next;})}>
       <option value="">Choose an owned machine</option>{machines.map(value=><option key={value.id} value={value.id} disabled={!warMachineAvailable(offenseMachines,teamKey,value.id)}>{value.name} · {value.active}/{value.passive}{warMachineAvailable(offenseMachines,teamKey,value.id)?"":" · assigned"}</option>)}
      </select>
      {machine?<div className="warOffenseMachineStatus"><Link className="warOffenseMachineName" href={`/characters/${machine.id}`}><CharacterPortrait id={machine.id} name={machine.name} icon={machine.icon}/><strong>{machine.name}</strong></Link><WarUnitReadiness unit={{rank:machine.rank??null,rarity:machine.rarity,progressionIndex:machine.progressionIndex,activeLevel:machine.activeLevel??machine.active,passiveLevel:machine.passiveLevel??machine.passive,items:machine.items??[]}} tier={targetTier}/></div>:<p className="sub">Select the Machine of War for this lineup.</p>}
     </div>
    </div>
     </div>
    </details>
   </section>;
  })}
  {offenseSlots.length<10?<p className="empty">Only {offenseSlots.length} non-overlapping offense teams can be built from your currently owned characters and the available source lineups.</p>:null}
  <section className="warUnassignedRecommendations"><h3>Strong unassigned characters</h3><p className="sub">Owned, high-ranked characters with a strong community rating who are not on a selected War team.</p><div className="warOffenseCandidates">{availableRecommendations.map(unit=><article key={unit.id}><Link href={`/characters/${unit.id}`} className="warDefenseCharacter"><CharacterPortrait id={unit.id} name={unit.name} icon={unit.icon}/><strong>{unit.name}</strong></Link><WarUnitReadiness unit={unit} tier="silver"/><small>Community rating {unit.score.toFixed(2)}</small></article>)}</div>{availableRecommendations.length===0?<p className="sub">No unassigned owned characters currently meet the rating threshold.</p>:null}</section>
  {unlockTargets.length?<details className="warUnassignedRecommendations warUnlockTargets"><summary><h3>Potential unlocks · top {Math.min(8,unlockTargets.length)}</h3></summary><p className="sub">Unowned characters seen in strong source lineups. Rates are for the observed core or exact lineup—not guaranteed for your team. Shop entries are catalog schedules, not live stock.</p><div className="warOffenseCandidates">{unlockTargets.slice(0,8).map(target=><article key={target.id}><Link href={`/characters/${target.id}`} className="warDefenseCharacter"><CharacterPortrait id={target.id} name={target.name} icon={target.icon}/><strong>{target.name}</strong></Link><small>{target.evidence}</small><small>{target.used.toLocaleString()} uses · {target.win.toFixed(1)}% wins</small>{target.campaigns.length?<small>Campaigns: {target.campaigns.join(", ")}</small>:null}{target.shops.length?<small>Shops: {target.shops.map(offer=>`${offer.shop} · ${offer.rotation} · ${offer.price}`).join("; ")}</small>:null}<Link href={`/sources?item=shards_${target.id}`}>Shard sources</Link></article>)}</div></details>:null}
 </section>;
 return <><div className="abilityViews warModeTabs" role="tablist" aria-label="Guild War views"><button type="button" id="war-tab-defense" role="tab" aria-controls="war-panel-defense" aria-selected={mode==="defense"} className={mode==="defense"?"active":""} onClick={()=>setMode("defense")}>Defense teams</button><button type="button" id="war-tab-offense" role="tab" aria-controls="war-panel-offense" aria-selected={mode==="offense"} className={mode==="offense"?"active":""} onClick={()=>setMode("offense")}>Offense teams</button><button type="button" id="war-tab-counters" role="tab" aria-controls="war-panel-counters" aria-selected={mode==="counters"} className={mode==="counters"?"active":""} onClick={()=>setMode("counters")}>Counter guide</button></div><div className="warModePanel" id="war-panel-defense" role="tabpanel" aria-labelledby="war-tab-defense" hidden={mode!=="defense"}>{defensePanel}</div><div className="warModePanel" id="war-panel-offense" role="tabpanel" aria-labelledby="war-tab-offense" hidden={mode!=="offense"}>{offensePanel}</div><div className="warModePanel" id="war-panel-counters" role="tabpanel" aria-labelledby="war-tab-counters" hidden={mode!=="counters"}>{counterGuide}</div><ReferenceDetails label="Team selection and source evidence">{defenseSource?<p>Imported {defenseSource.importedAt.slice(0,10)} / <Link href="https://tacticus.xyz/wars/analyze/defenders">TacticusXYZ defender source</Link></p>:null}<p>Defense and offense have separate sources and assignments. Each character appears once within each list. Defense ranks cores by their observed defense rate, breaking ties by sample size. Flex suggestions require at least 100 observed attacks and are ranked by hold rate, then sample size; overlapping flex samples are not added together or presented as a measured five-character hold rate. Exact offense statistics belong to the recorded five-character lineup; a core/flex suggestion displays the three-character core's observed rate only.</p><p>Slot order affects starting positions and the AI action sequence, but does not guarantee ability timing. Map layout, movement and targeting still matter. The Rotbone-late starting suggestion is a planning judgment from <a href="https://www.reddit.com/r/WH40KTacticus/comments/1t2zgo6/gw_defense_lineups_advice/">community defense guidance</a>; other teams retain source order until you adjust them. <a href="https://www.reddit.com/r/WH40KTacticus/comments/1pjbzic/guild_war_maps_s19_b1/">Numbered community maps</a> explain slot-to-hex placement; use the map for your current war.</p><p>The snapshot contains 20 displayed cores, with no Battlefield 2 or Fortified-only breakdown. Gold requires current Gold I rank or higher; Silver requires Silver I or higher. Ability and gear shortfalls appear inside each team. Machine suggestions allocate reviewed ability fits across all teams without duplicates, preserving manual selections. Current levels provide a small readiness preference within the lineup's rarity and ability caps, not a damage or survival guarantee. Silver readiness uses the Rare 1 red star / level 26 ceiling; Gold uses Epic 3 red stars / level 35. These are planning targets for the lineup categories, not a substitute for checking each live zone's slot cap. No Mythic benefit is assumed. This does not spend resources or set upgrade targets. Your selections are saved in this browser.</p></ReferenceDetails></>;
}
