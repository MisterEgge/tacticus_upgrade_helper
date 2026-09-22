"use client";
import {useMemo,useState} from "react";
import CharacterName from "../components/CharacterName";
import DataTable,{Column,Filter} from "../components/DataTable";
import {formatAbilityName,type AbilityGuideRow as Row} from "../../src/domain/abilities";
import type {RaidBossMeta} from "../../src/domain/raidMeta";

type RaidMetaFile={_meta:{sourceUrl:string;reviewedOn:string;note:string};bosses:RaidBossMeta};

export default function AbilityTable({rows,campaignGroups,raidMeta}:{rows:Row[];campaignGroups:Array<{name:string;characterIds:string[]}>;raidMeta:RaidMetaFile}){
 const [view,setView]=useState("all");
 const [campaign,setCampaign]=useState("all");
 const bosses=raidMeta.bosses;
 const firstBoss=Object.keys(bosses)[0]!;
 const [boss,setBoss]=useState(firstBoss);
 const [team,setTeam]=useState(Object.keys(bosses[firstBoss]!)[0]!);
 const selected=bosses[boss]![team]!;
 const selectedNames=[...selected.core,...selected.flex];
 const ownedNames=new Set(rows.map(row=>row.character));
 const missingCore=selected.core.filter(name=>!ownedNames.has(name));
 const ownedFlex=selected.flex.filter(name=>ownedNames.has(name));
 const selectedCampaign=campaignGroups.find(group=>group.name===campaign);
 const visible=useMemo(()=>view==="campaign"?rows.filter(row=>campaign==="all"?campaignGroups.some(group=>group.characterIds.includes(row.id)):selectedCampaign?.characterIds.includes(row.id)):view==="raid"?rows.filter(row=>selectedNames.includes(row.character)).sort((a,b)=>selectedNames.indexOf(a.character)-selectedNames.indexOf(b.character)):rows,[rows,view,campaign,campaignGroups,selectedCampaign,selectedNames]);
 const cols:Column<Row>[]=[
  {key:"character",label:"Character",render:x=><><CharacterName name={x.character} id={x.id} icon={x.icon}/>{view==="raid"?<small>{selected.core.includes(x.character)?"Core":"Flex option"}</small>:<small>{x.faction}</small>}</>,sort:x=>view==="raid"?selectedNames.indexOf(x.character):x.character,search:x=>x.character+" "+x.faction},
  {key:"active",label:"Active targets",render:x=><div className="abilityTarget"><strong>Lv {x.activeLevel??"UNKNOWN"}</strong><small>{formatAbilityName(x.activeId)}</small><strong>{x.reviewed?`Practical: ${x.communityActiveTarget}`:"Baseline: 17"}</strong><small>{x.reviewed?`High investment: ${x.activeHigh}`:"General stop: 35 · high 44–50"}</small></div>,sort:x=>x.activeLevel??-1,search:x=>x.activeId+" "+x.communityActiveTarget},
  {key:"passive",label:"Passive targets",render:x=><div className="abilityTarget"><strong>Lv {x.passiveLevel??"UNKNOWN"}</strong><small>{formatAbilityName(x.passiveId)}</small><strong>{x.reviewed?`Practical: ${x.communityPassiveTarget}`:"Baseline: 17"}</strong><small>{x.reviewed?`High investment: ${x.passiveHigh}`:"General stop: 35 · high 44–50"}</small></div>,sort:x=>x.passiveLevel??-1,search:x=>x.passiveId+" "+x.communityPassiveTarget}
 ];
 const filters:Filter<Row>[]=[{key:"belowTarget",label:"Below shown target",matches:x=>(x.activeLevel??Infinity)<x.activeTargetLevel||(x.passiveLevel??Infinity)<x.passiveTargetLevel},{key:"reviewed",label:"Community-guided",matches:x=>x.reviewed},{key:"unreviewed",label:"General guideline only",matches:x=>!x.reviewed}];
 return <><div className="abilityViews"><label>View<select value={view} onChange={event=>setView(event.target.value)}><option value="all">All owned characters</option><option value="campaign">Campaign characters</option><option value="raid">Guild Raid meta team</option></select></label>{view==="campaign"?<label>Incomplete campaign<select value={campaign} onChange={event=>setCampaign(event.target.value)}><option value="all">All incomplete campaigns</option>{campaignGroups.map(group=><option key={group.name}>{group.name}</option>)}</select></label>:null}{view==="raid"?<><label>Raid boss<select value={boss} onChange={event=>{const next=event.target.value;setBoss(next);setTeam(Object.keys(bosses[next]!)[0]!);}}>{Object.keys(bosses).map(name=><option key={name}>{name}</option>)}</select></label><label>Team<select value={team} onChange={event=>setTeam(event.target.value)}>{Object.keys(bosses[boss]!).map(name=><option key={name}>{name}</option>)}</select></label></>:null}</div>{view==="campaign"?<p className="sub">Only characters required for incomplete campaigns are shown{selectedCampaign?` · ${selectedCampaign.name}`:""}.</p>:null}{view==="raid"?<section className="raidTeamSummary"><div><small>CORE · {selected.core.length-missingCore.length}/{selected.core.length} OWNED</small><strong>{selected.core.join(" · ")}</strong></div>{missingCore.length?<div><small>MISSING CORE</small><span>{missingCore.join(" · ")}</span></div>:null}{selected.flex.length?<div><small>OWNED FLEX · {ownedFlex.length}/{selected.flex.length}</small><span>{selected.flex.join(" · ")}</span></div>:null}<p>{raidMeta._meta.note} <a href={raidMeta._meta.sourceUrl} target="_blank" rel="noreferrer">Tacticus Codex</a>, checked {raidMeta._meta.reviewedOn}.</p></section>:null}<DataTable rows={visible} columns={cols} filters={filters} placeholder="Search your character, ability, breakpoint or faction…"/></>;
}
