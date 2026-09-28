"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import { rankName } from "../../src/domain/ranks";

type Member={name:string;id:string;icon?:string|undefined;owned:boolean;rank:number|null;xpLevel:number|null;activeLevel:number|null;passiveLevel:number|null;activeTarget:string;passiveTarget:string;targetBasis:string};
type Team={core:string[];flex:string[];members:Member[]};
type Teams=Record<string,Record<string,Team>>;

function abilityStep(level:number|null,target:string,xpLevel:number|null):string
{
    if(level===null||xpLevel===null)return "Future option · not owned";
    const first=Number.parseInt(target,10);
    if(!Number.isFinite(first))return "Target needs research";
    if(level>=first)return "At suggested first stop";
    if(level>=xpLevel)return `XP needed for level ${level+1}`;
    return `Upgrade now: ${level} → ${Math.min(first,xpLevel)}${first>xpLevel?` · XP needed for ${first}`:""}`;
}

export default function GuildRaidPlanner({teams,source}:{teams:Teams;source:{sourceUrl:string;reviewedOn:string;note:string}})
{

    const bosses=Object.keys(teams);const[firstBoss]=bosses;const[boss,setBoss]=useState(firstBoss!);const[firstTeam]=Object.keys(teams[firstBoss!]!);const[teamName,setTeamName]=useState(firstTeam!);const[flexOne,setFlexOne]=useState("");const[flexTwo,setFlexTwo]=useState("");
    const team=teams[boss]![teamName]!;
    const selectedFlex=useMemo(()=>[flexOne,flexTwo].filter(Boolean),[flexOne,flexTwo]);
    const lineup=[...team.core,...selectedFlex];
    const members=lineup.map(name=>team.members.find(member=>member.name===name)!).filter(Boolean);
    const ownedCore=team.core.filter(name=>team.members.find(member=>member.name===name)?.owned);
    const missingCore=team.core.filter(name=>!team.members.find(member=>member.name===name)?.owned);
    const setBossChoice=(next:string)=>{setBoss(next);setTeamName(Object.keys(teams[next]!)[0]!);setFlexOne("");setFlexTwo("");};
    const setTeamChoice=(next:string)=>{setTeamName(next);setFlexOne("");setFlexTwo("");};
    return <><section className="panel detailPanel"><div className="detailCopy"><div className="abilityViews"><label>Raid boss<select value={boss} onChange={event=>setBossChoice(event.target.value)}>{bosses.map(name=><option key={name}>{name}</option>)}</select></label><label>Meta team<select value={teamName} onChange={event=>setTeamChoice(event.target.value)}>{Object.keys(teams[boss]!).map(name=><option key={name}>{name}</option>)}</select></label>{team.flex.length?<><label>Flex slot 1<select value={flexOne} onChange={event=>{setFlexOne(event.target.value);if(event.target.value===flexTwo)setFlexTwo("");}}><option value="">Choose later</option>{team.flex.map(name=><option key={name} value={name}>{name}{team.members.find(member=>member.name===name)?.owned?"":" · not owned"}</option>)}</select></label><label>Flex slot 2<select value={flexTwo} onChange={event=>setFlexTwo(event.target.value)}><option value="">Choose later</option>{team.flex.filter(name=>name!==flexOne).map(name=><option key={name} value={name}>{name}{team.members.find(member=>member.name===name)?.owned?"":" · not owned"}</option>)}</select></label></>:null}</div><div className="raidTeamSummary"><div><small>CORE OWNED</small><strong>{ownedCore.length}/{team.core.length}</strong><span>{team.core.join(" · ")}</span></div>{missingCore.length?<div><small>MISSING CORE</small><strong>{missingCore.join(" · ")}</strong><span>This team is an option, not an immediate build assignment.</span></div>:null}<div><small>SELECTED LINEUP</small><strong>{lineup.length}/5 characters</strong><span>{lineup.join(" · ")}</span></div><p>{source.note} <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source: Tacticus Codex</a> · reviewed {source.reviewedOn}.</p></div></div></section><section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">RAID UPGRADE PLAN</p><h2>{teamName} vs {boss}</h2><p className="sub">Choose a lineup to see its current ability steps and longer term targets. The step is limited by current XP; badge availability is not checked here.</p></div><div className="power">{members.filter(member=>member.owned).length}/{members.length}<strong> owned</strong></div></div><div className="tableWrap"><table><thead><tr><th>Role</th><th>Character</th><th>Current rank</th><th>XP level</th><th>Ability steps and targets</th></tr></thead><tbody>{members.map(member=><tr key={member.name}><td>{team.core.includes(member.name)?"Core":"Selected flex"}</td><td>{member.owned?<Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link>:<CharacterName name={member.name} id={member.id} icon={member.icon}/>}<small>{member.owned?"Owned":"Not owned · future option only"}</small></td><td>{member.rank===null?"—":rankName(member.rank)}</td><td>{member.xpLevel??"—"}</td><td><strong>Active {member.activeLevel??"—"} → {member.activeTarget}</strong><small>{abilityStep(member.activeLevel,member.activeTarget,member.xpLevel)}</small><strong>Passive {member.passiveLevel??"—"} → {member.passiveTarget}</strong><small>{abilityStep(member.passiveLevel,member.passiveTarget,member.xpLevel)}</small><small>{member.targetBasis}</small></td></tr>)}</tbody></table></div></section></>;

}
