"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReferenceDetails from "../components/ReferenceDetails";
import CharacterName from "../components/CharacterName";
import { rankName } from "../../src/domain/ranks";
import type { RaidTeam } from "../../src/domain/raidMeta";
import { suggestedRaidFlex } from "../../src/domain/raidLineup";
import { raidAbilityStep } from "../../src/domain/raidAbilityStep";
import { abilityTargetMet, formatAbilityTarget } from "../../src/domain/targetDisplay";
import type { RaidSelection } from "../../src/domain/raidSelection";
import type { RosterUnit } from "../lib/report";
import LaviscusRoadmap from "./LaviscusRoadmap";

type Member={name:string;id:string;icon?:string|undefined;owned:boolean;rarity:string|null;rank:number|null;xpLevel:number|null;activeLevel:number|null;passiveLevel:number|null;activeTarget:string;passiveTarget:string;activeBasis:string;passiveBasis:string};
type Team=RaidTeam & {members:Member[]};
type Teams=Record<string,Record<string,Team>>;

function lineupMatches(selected:string[],recommended:string[]):boolean
{
    return selected.length===recommended.length&&recommended.every(name=>selected.includes(name));
}

export default function GuildRaidPlanner({teams,source,mainSelection,roster}:{teams:Teams;source:{sourceUrl:string;reviewedOn:string;note:string};mainSelection:RaidSelection;roster:RosterUnit[]})
{

    const router=useRouter();
    const bosses=Object.keys(teams);const[boss,setBoss]=useState(mainSelection.boss);const[teamName,setTeamName]=useState(mainSelection.teamName);
    const[flex,setFlex]=useState(mainSelection.flex);const[autoFlex,setAutoFlex]=useState(mainSelection.autoFlex!==false);
    const[saved,setSaved]=useState(mainSelection);const[saving,setSaving]=useState(false);const[saveError,setSaveError]=useState("");
    const team=teams[boss]![teamName]!;
    const flexSlots=Math.max(0,5-team.core.length);
    const selectedFlex=flex.slice(0,flexSlots).filter(Boolean);
    const suggested=suggestedRaidFlex(boss,teamName,team);
    const recommendation=team.recommendation;
    const matchesRecommendation=!!recommendation&&lineupMatches([...team.core,...selectedFlex],recommendation.lineup);
    const lineup=[...team.core,...selectedFlex];
    const members=lineup.map(name=>team.members.find(member=>member.name===name)!).filter(Boolean);
    const missingCore=team.core.filter(name=>!team.members.find(member=>member.name===name)?.owned);
    const setBossChoice=(next:string)=>{const nextTeam=Object.keys(teams[next]!)[0]!;const flex=suggestedRaidFlex(next,nextTeam,teams[next]![nextTeam]!);setBoss(next);setTeamName(nextTeam);setFlex(flex);setAutoFlex(true);};
    const setTeamChoice=(next:string)=>{const flex=suggestedRaidFlex(boss,next,teams[boss]![next]!);setTeamName(next);setFlex(flex);setAutoFlex(true);};
    const isSaved=saved.boss===boss&&saved.teamName===teamName&&JSON.stringify(saved.flex)===JSON.stringify(selectedFlex)&&(saved.autoFlex!==false)===autoFlex;
    async function saveMainTeam()
    {
        setSaving(true);setSaveError("");
        try
        {
            const response=await fetch("/api/raid-selection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({boss,teamName,flex:selectedFlex,autoFlex})});
            if(!response.ok)throw new Error("Could not save this lineup. Try again.");
            setSaved({boss,teamName,flex:selectedFlex,autoFlex});router.refresh();
        }
        catch(error){setSaveError(error instanceof Error?error.message:"Could not save this lineup.");}
        finally{setSaving(false);}
    }
    return <><section className="panel detailPanel"><div className="detailCopy"><div className="abilityViews"><label>Raid boss<select value={boss} onChange={event=>setBossChoice(event.target.value)}>{bosses.map(name=><option key={name}>{name}</option>)}</select></label><label>Meta team<select value={teamName} onChange={event=>setTeamChoice(event.target.value)}>{Object.keys(teams[boss]!).map(name=><option key={name}>{name}</option>)}</select></label>{team.flex.length?Array.from({length:flexSlots},(_,index)=><label key={index}>Flex slot {index+1}<select value={flex[index]??""} onChange={event=>{const next=Array.from({length:flexSlots},(_,slot)=>flex[slot]??"");next[index]=event.target.value;for(let slot=0;slot<next.length;slot++)if(slot!==index&&next[slot]===event.target.value)next[slot]="";setFlex(next);setAutoFlex(false);}}><option value="">Choose later</option>{team.flex.filter(name=>!selectedFlex.includes(name)||flex[index]===name).map(name=><option key={name} value={name} disabled={!team.members.find(member=>member.name===name)?.owned}>{name}{team.members.find(member=>member.name===name)?.owned?"":" · not owned"}</option>)}</select></label>):null}</div><div className="raidSave">{team.flex.length?<button type="button" onClick={()=>{setFlex(suggested);setAutoFlex(true);}} disabled={autoFlex&&JSON.stringify(selectedFlex)===JSON.stringify(suggested)}>Use recommended owned flex</button>:null}<button type="button" onClick={saveMainTeam} disabled={saving||isSaved}>{saving?"Saving…":isSaved?"Main team saved":"Set as main Raid team"}</button>{saveError?<small role="alert">{saveError}</small>:null}</div><div className="raidTeamSummary">{missingCore.length?<div><small>MISSING CORE</small><strong>{missingCore.join(" · ")}</strong><span>Missing characters must be unlocked to build this core.</span></div>:null}<div><small>SELECTED LINEUP</small><strong>{lineup.length}/5 characters</strong><span>{lineup.join(" · ")}</span></div><div><small>{autoFlex?"AUTOMATIC OWNED FLEX":"MANUAL FLEX"}</small><span>{missingCore.length?"Core unlocks needed · owned flex selected":matchesRecommendation?"Matches the cited five-character recommendation":team.flex.length?"Assembled from owned source alternatives · exact lineup performance unverified":"Source core lineup · boss-specific ranking not recorded"}</span></div><ReferenceDetails label="Meta source"><p>{source.note} <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source: Tacticus Codex</a> · reviewed {source.reviewedOn}.</p>{recommendation?<p>Boss default: {recommendation.lineup.join(" · ")}. <a href={recommendation.sourceUrl} target="_blank" rel="noreferrer">Terminus Maximus replay guide</a> · updated {recommendation.sourceUpdatedOn}, checked {recommendation.reviewedOn} · {recommendation.replays} replays with {recommendation.machine}. The source recommends this complete five plus its machine; substitutions do not inherit its measured performance.</p>:<p>No ranked boss flex recorded for this core. Automatic selection fills from owned source alternatives.</p>}</ReferenceDetails></div></div></section><section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">RAID UPGRADE PLAN</p><h2>{teamName} vs {boss}</h2><p className="sub">Upgrade steps respect current XP and rarity. Check badges and coins before spending.</p></div><div className="power">{members.filter(member=>member.owned).length}/{members.length}<strong> owned</strong></div></div><div className="tableWrap"><table><thead><tr><th>Character</th><th>Rank / level</th><th>Ability steps and targets</th></tr></thead><tbody>{members.map(member=><tr key={member.name}><td>{member.owned?<Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link>:<CharacterName name={member.name} id={member.id} icon={member.icon}/>}<small>{member.owned?team.core.includes(member.name)?"Core":"Flex":"Not owned"}</small></td><td>{member.rank===null?"—":rankName(member.rank)}<small>Level {member.xpLevel??"—"}</small></td><td><strong>Active {formatAbilityTarget(member.activeLevel,member.activeTarget)}</strong><small>{abilityTargetMet(member.activeLevel,member.activeTarget)?"Current level " + member.activeLevel:member.owned?raidAbilityStep(member.activeLevel,member.activeTarget,member.xpLevel,member.rarity):"Unlock this character before upgrading"}</small><strong>Passive {formatAbilityTarget(member.passiveLevel,member.passiveTarget)}</strong><small>{abilityTargetMet(member.passiveLevel,member.passiveTarget)?"Current level " + member.passiveLevel:member.owned?raidAbilityStep(member.passiveLevel,member.passiveTarget,member.xpLevel,member.rarity):"Unlock this character before upgrading"}</small><ReferenceDetails label="Ability target basis"><p>Active: {member.activeBasis}</p><p>Passive: {member.passiveBasis}</p></ReferenceDetails></td></tr>)}</tbody></table></div></section><LaviscusRoadmap roster={roster} members={members} machine={recommendation?.machine}/></>;

}
