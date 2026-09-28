"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import { rankName } from "../../src/domain/ranks";
import { suggestedRaidFlex } from "../../src/domain/raidLineup";
import { raidAbilityStep } from "../../src/domain/raidAbilityStep";

type Member={name:string;id:string;icon?:string|undefined;owned:boolean;rarity:string|null;rank:number|null;xpLevel:number|null;activeLevel:number|null;passiveLevel:number|null;activeTarget:string;passiveTarget:string;activeBasis:string;passiveBasis:string};
type Team={core:string[];flex:string[];members:Member[]};
type Teams=Record<string,Record<string,Team>>;

export default function GuildRaidPlanner({teams,source}:{teams:Teams;source:{sourceUrl:string;reviewedOn:string;note:string}})
{

    const bosses=Object.keys(teams);const[firstBoss]=bosses;const[boss,setBoss]=useState(firstBoss!);const[firstTeam]=Object.keys(teams[firstBoss!]!);const[teamName,setTeamName]=useState(firstTeam!);
    const initialFlex=suggestedRaidFlex(firstBoss!,firstTeam!,teams[firstBoss!]![firstTeam!]!);
    const[flexOne,setFlexOne]=useState(initialFlex[0]??"");const[flexTwo,setFlexTwo]=useState(initialFlex[1]??"");
    const team=teams[boss]![teamName]!;
    const selectedFlex=useMemo(()=>[flexOne,flexTwo].filter(Boolean),[flexOne,flexTwo]);
    const lineup=[...team.core,...selectedFlex];
    const members=lineup.map(name=>team.members.find(member=>member.name===name)!).filter(Boolean);
    const ownedCore=team.core.filter(name=>team.members.find(member=>member.name===name)?.owned);
    const missingCore=team.core.filter(name=>!team.members.find(member=>member.name===name)?.owned);
    const setBossChoice=(next:string)=>{const nextTeam=Object.keys(teams[next]!)[0]!;const flex=suggestedRaidFlex(next,nextTeam,teams[next]![nextTeam]!);setBoss(next);setTeamName(nextTeam);setFlexOne(flex[0]??"");setFlexTwo(flex[1]??"");};
    const setTeamChoice=(next:string)=>{const flex=suggestedRaidFlex(boss,next,teams[boss]![next]!);setTeamName(next);setFlexOne(flex[0]??"");setFlexTwo(flex[1]??"");};
    return <><section className="panel detailPanel"><div className="detailCopy"><div className="abilityViews"><label>Raid boss<select value={boss} onChange={event=>setBossChoice(event.target.value)}>{bosses.map(name=><option key={name}>{name}</option>)}</select></label><label>Meta team<select value={teamName} onChange={event=>setTeamChoice(event.target.value)}>{Object.keys(teams[boss]!).map(name=><option key={name}>{name}</option>)}</select></label>{team.flex.length?<><label>Flex slot 1<select value={flexOne} onChange={event=>{setFlexOne(event.target.value);if(event.target.value===flexTwo)setFlexTwo("");}}><option value="">Choose later</option>{team.flex.map(name=><option key={name} value={name}>{name}{team.members.find(member=>member.name===name)?.owned?"":" · not owned"}</option>)}</select></label><label>Flex slot 2<select value={flexTwo} onChange={event=>setFlexTwo(event.target.value)}><option value="">Choose later</option>{team.flex.filter(name=>name!==flexOne).map(name=><option key={name} value={name}>{name}{team.members.find(member=>member.name===name)?.owned?"":" · not owned"}</option>)}</select></label></>:null}</div><div className="raidTeamSummary"><div><small>CORE OWNED</small><strong>{ownedCore.length}/{team.core.length}</strong><span>{team.core.join(" · ")}</span></div>{missingCore.length?<div><small>MISSING CORE</small><strong>{missingCore.join(" · ")}</strong><span>This team is an option, not an immediate build assignment.</span></div>:null}<div><small>SELECTED LINEUP</small><strong>{lineup.length}/5 characters</strong><span>{lineup.join(" · ")}</span>{boss==="Avatar of Khaine"&&teamName==="Big Hit"&&selectedFlex.length?<small>Suggested owned flex pairing for this boss · change either slot as needed</small>:null}</div><p>{source.note} <a href={source.sourceUrl} target="_blank" rel="noreferrer">Source: Tacticus Codex</a> · reviewed {source.reviewedOn}.</p></div></div></section><section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">RAID UPGRADE PLAN</p><h2>{teamName} vs {boss}</h2><p className="sub">Choose a lineup to see its current ability steps and longer term targets. The step is limited by current XP and rarity; check badge and coin availability in game.</p></div><div className="power">{members.filter(member=>member.owned).length}/{members.length}<strong> owned</strong></div></div><div className="tableWrap"><table><thead><tr><th>Role</th><th>Character</th><th>Current rank</th><th>XP level</th><th>Ability steps and targets</th></tr></thead><tbody>{members.map(member=><tr key={member.name}><td>{team.core.includes(member.name)?"Core":"Selected flex"}</td><td>{member.owned?<Link className="characterLink" href={`/characters/${member.id}`}><CharacterName name={member.name} id={member.id} icon={member.icon}/></Link>:<CharacterName name={member.name} id={member.id} icon={member.icon}/>}<small>{member.owned?"Owned":"Not owned · future option only"}</small></td><td>{member.rank===null?"—":rankName(member.rank)}</td><td>{member.xpLevel??"—"}</td><td><strong>Active {member.activeLevel??"—"} → {member.activeTarget}</strong><small>{raidAbilityStep(member.activeLevel,member.activeTarget,member.xpLevel,member.rarity)} · {member.activeBasis}</small><strong>Passive {member.passiveLevel??"—"} → {member.passiveTarget}</strong><small>{raidAbilityStep(member.passiveLevel,member.passiveTarget,member.xpLevel,member.rarity)} · {member.passiveBasis}</small></td></tr>)}</tbody></table></div></section></>;

}
