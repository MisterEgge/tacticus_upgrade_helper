"use client";

import Link from "next/link";
import CharacterName from "./components/CharacterName";
import ViewTabs from "./components/ViewTabs";
import type {CharacterRosterRow} from "./lib/characterUpgradeSummary";
import type {UtilityRating} from "../src/domain/characterUtility";
import type {ReactNode} from "react";

type OnslaughtTarget={id:string;name:string;icon?:string|undefined;rarity:string;reasons:string[]};

function CharacterList({rows,empty}:{rows:Array<{id:string;name:string;icon?:string|undefined;detail:ReactNode;tags?:string[]}>;empty:string}){
 return rows.length?<div className="dashboardActionList">{rows.map(row=><article className="dashboardActionItem" key={row.id}>
  <Link href={`/characters/${encodeURIComponent(row.id)}`}><CharacterName id={row.id} name={row.name} icon={row.icon}/></Link>
  {row.tags?.length?<div className="dashboardActionTags">{row.tags.map(tag=><span key={tag}>{tag}</span>)}</div>:null}
  <div className="dashboardActionDetail">{row.detail}</div>
 </article>)}</div>:<p className="sub">{empty}</p>;
}

export default function DashboardUpgradeTabs({nextRows,rows,ratings,onslaughtTargets}:{nextRows:CharacterRosterRow[];rows:CharacterRosterRow[];ratings:UtilityRating[];onslaughtTargets:OnslaughtTarget[]}){
 const ratingByName=new Map(ratings.map(row=>[row.name,row]));
 const teamRows=rows.flatMap(row=>{
  const rating=ratingByName.get(row.name);
  if(!rating||!row.actions.length||!(rating.raidCore||rating.raidFlex||rating.warOption||rating.mainRaidCore||rating.mainRaidFlex))return [];
  const tags=[...(rating.mainRaidCore?["Raid core"]:rating.mainRaidFlex?["Raid flex"]:rating.raidCore?["Raid meta"]:rating.raidFlex?["Raid flex"]:[]),...(rating.warOption?["War lineup"]:[])];
  return [{id:row.id,name:row.name,icon:row.icon,tags,detail:row.actions.slice(0,2).map(action=>action.label).join(" · ")}];
 }).slice(0,8);
 const badgeRows=rows.filter(row=>row.badgesNeeded).slice(0,8).map(row=>({id:row.id,name:row.name,icon:row.icon,detail:row.actions.find(action=>action.kind==="ability")?.detail??"Ability badge shortage"}));
 const orbRows=rows.filter(row=>row.orbsNeeded).slice(0,8).map(row=>({id:row.id,name:row.name,icon:row.icon,detail:row.actions.find(action=>action.kind==="ascension")?.detail??"Orb shortage"}));
 const immediateRows=nextRows.map(row=>({id:row.id,name:row.name,icon:row.icon,detail:<>{row.actions.slice(0,2).map(action=><div key={action.kind}><Link href={action.href}>{action.label}</Link><small>{action.detail}</small></div>)}</>}));
 const tabs=[
  {label:`Next (${immediateRows.length})`,content:<CharacterList rows={immediateRows} empty="No immediate upgrade actions found."/>},
  {label:`War & Raid (${teamRows.length})`,content:<CharacterList rows={teamRows} empty="No current War or Raid lineup characters have planned upgrades."/>},
  {label:`Onslaught (${onslaughtTargets.length})`,content:<CharacterList rows={onslaughtTargets.map(target=>({id:target.id,name:target.name,icon:target.icon,tags:[target.rarity],detail:target.reasons.slice(0,2).join(" · ")}))} empty="No current Onslaught honor targets found."/>},
  {label:`Orbs & badges (${orbRows.length+badgeRows.length})`,content:<>
   <div className="dashboardResourceLinks"><Link href="/orbs">Orb planner →</Link><Link href="/abilities">Badge budget →</Link><Link href="/onslaught">Onslaught planner →</Link></div>
   <div className="dashboardResourceColumns">
    <section aria-label="Characters needing orbs"><h3>Orbs <span>{orbRows.length}</span></h3><CharacterList rows={orbRows} empty="No immediate orb shortages." /></section>
    <section aria-label="Characters needing badges"><h3>Badges <span>{badgeRows.length}</span></h3><CharacterList rows={badgeRows} empty="No current badge shortages." /></section>
   </div>
  </>}
 ];
 return <section className="panel overviewPanel" aria-label="Account upgrade overview">
  <div className="sectionTitle"><div><h2>Upgrade focus</h2><p className="sub">A short action list, grouped by what you’re planning for.</p></div><Link className="viewLink" href="/characters">All characters →</Link></div>
  <ViewTabs label="Dashboard upgrade categories" defaultTab={tabs[0]!.label} tabs={tabs}/>
 </section>;
}
