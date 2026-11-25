"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import CharacterName,{CharacterPortrait} from "../components/CharacterName";
import RankBadge from "../components/RankBadge";
import RarityBadge from "../components/RarityBadge";
import ReferenceDetails from "../components/ReferenceDetails";
import ViewTabs from "../components/ViewTabs";
import {CHARACTER_RARITIES,rarityForGoal} from "../../src/domain/characterProgression";
import {WAR_PLAN_STORAGE_KEY} from "../../src/domain/warBadgeTargets";
import {groupWarUpgrades,warUpgradeRecommendations,warUpgradeAssignments,warUpgradeReassignments,type WarSide,type WarUpgradeSource,type WarUpgradeUnit} from "../../src/domain/warUpgrades";

type Props={roster:WarUpgradeUnit[];sources:WarUpgradeSource[];defaults:Record<WarSide,string[][]>;reviewed:Record<WarSide,string>;defenseMetric?:string;initialTeam?:string|undefined;initialSide?:WarSide;initialTier?:"silver"|"gold"};
export default function WarUpgradePlanner({roster,sources,defaults,reviewed,defenseMetric,initialTeam,initialSide="defense",initialTier="silver"}:Props){
 const [tier,setTier]=useState<"silver"|"gold">(initialTier),[query,setQuery]=useState("");
 const [saved,setSaved]=useState<unknown>(null),[expanded,setExpanded]=useState(false),[teamFilter,setTeamFilter]=useState(initialTeam??"");
 useEffect(()=>{const read=()=>{try{setSaved(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSaved(null);}};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 const recommendations=useMemo(()=>({defense:warUpgradeRecommendations(roster,sources,tier,"defense"),offense:warUpgradeRecommendations(roster,sources,tier,"offense")}),[roster,sources,tier]);
 const byId=new Map(roster.map(unit=>[unit.id,unit])),target=tier==="silver"?9:12,requiredRarity=rarityForGoal(target,null);
 const body=(side:WarSide)=>{
  const groups=groupWarUpgrades(recommendations[side],roster);
  const matching=groups.filter(group=>(!teamFilter||group.id===teamFilter)&&(!query.trim()||[group.name,...group.upgrades.map(row=>row.unit.name)].some(name=>name.toLowerCase().includes(query.trim().toLowerCase()))));
  const rows=expanded?matching:matching.slice(0,6),assignments=warUpgradeAssignments(saved,side,defaults[side],new Set(byId.keys()));
  return <section className="warUpgradePanel" aria-label={`${side==="defense"?"Defense":"Offense"} upgrade opportunities`}>
   {teamFilter?<button className="warUpgradeMore" onClick={()=>setTeamFilter("")}>Show all teams</button>:null}
   {rows.map(group=>{
    const plan=group.plan,changes=warUpgradeReassignments(plan,assignments);
    return <article className="panel warUpgradeTeam" key={group.id} aria-label={group.name}>
     <header><h2>{group.name}</h2><p className="sub">{plan.rate.toFixed(1)}% {plan.kind==="lineup"?"lineup wins":side==="defense"?"core holds":"core wins"} · {plan.used.toLocaleString()} attacks</p></header>
     <div className="warUpgradeLineup">{plan.core.map(id=>{const unit=byId.get(id)!;return <div key={id}><Link href={`/characters/${id}`}><CharacterPortrait id={id} name={unit.name}/><span>{unit.name}</span></Link><small>{plan.kind==="core"?"Core":"Recorded lineup"}</small></div>;})}</div>
     <div className="tableWrap"><table className="warUpgradeTable"><thead><tr><th>Character</th><th>Current</th><th>Target</th><th>Role</th><th>Next step</th></tr></thead><tbody>{group.upgrades.map(row=>{
      const rarityGate=CHARACTER_RARITIES.indexOf(row.unit.rarity as typeof CHARACTER_RARITIES[number])<CHARACTER_RARITIES.indexOf(requiredRarity);
      return <tr key={row.unit.id}><td data-label="Character"><Link href={`/characters/${row.unit.id}`}><CharacterName id={row.unit.id} name={row.unit.name}/></Link></td><td data-label="Current"><RankBadge rank={row.unit.rank}/></td><td data-label="Target"><RankBadge rank={row.targetRank}/>{rarityGate?<small><RarityBadge rarity={requiredRarity}/> required</small>:null}</td><td data-label="Role">{plan.kind==="lineup"?"Lineup member":plan.core.includes(row.unit.id)?"Core":"Flex option"}</td><td data-label="Next step"><Link href={`/farming?character=${row.unit.id}&target=${row.targetRank}`}>Plan materials</Link></td></tr>;
     })}</tbody></table></div>
     <ReferenceDetails label="Suggested five & alternatives">
      <div className="warUpgradeLineup">{plan.members.map(id=>{const unit=byId.get(id)!;return <div className={unit.rank<target?"warUpgradeNeeds":""} key={id}><Link href={`/characters/${id}`}><CharacterPortrait id={id} name={unit.name}/><span>{unit.name}</span></Link><RankBadge rank={unit.rank}/><small>{plan.kind==="core"?(plan.core.includes(id)?"Core":"Flex"):"Lineup member"}</small></div>;})}</div>
      <p>{plan.blockers.length} {plan.blockers.length===1?"character needs":"characters need"} upgrades for this suggested five. Other flex choices can change the prerequisites.</p>
      {plan.kind==="core"?<p>Flex cohorts overlap; the core rate is not a measured result for these five together.</p>:null}
      {group.upgrades.filter(row=>!plan.members.includes(row.unit.id)).map(row=>{const flex=row.plan.flex.find(choice=>choice.id===row.unit.id);return <p key={row.unit.id}>{row.unit.name}: alternative flex{flex?` · ${flex.rate.toFixed(1)}% / ${flex.used.toLocaleString()} attacks`:""}. Also needs: {row.plan.blockers.filter(id=>id!==row.unit.id).map(id=>byId.get(id)!.name).join(", ")||"no other rank upgrades"}.</p>;})}
      {changes?<p>Uses characters from {changes} current {side} lineups. Reassign them in the <Link href="/war-defense">War planner</Link>.</p>:null}
      <p>Teams can share characters; these are alternative projects. A character can only be assigned once per War side.</p>
     </ReferenceDetails>
    </article>;
   })}
   {!rows.length?<p className="warUpgradeEmpty">{query.trim()?"No matching characters in these opportunities.":"No owned source-backed rank upgrades found for this team and target. Try another team, rank or War side."}</p>:null}
   {!expanded&&matching.length>6?<button className="warUpgradeMore" type="button" onClick={()=>setExpanded(true)}>Show all {matching.length} teams</button>:null}
  </section>;
 };
 return <div className="warUpgradeWorkspace"><div className="abilityViews"><label>Build for<select aria-label="War upgrade target" value={tier} onChange={event=>{setTier(event.target.value as "silver"|"gold");setExpanded(false);}}><option value="silver">Silver I lineups</option><option value="gold">Gold I lineups</option></select></label><label>Character or team<input type="search" aria-label="Find upgrade character" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search characters or teams"/></label></div>
  <p className="sub">Group core upgrades together; choose two flex members. Flex upgrades are alternatives. Ordered by sample-aware evidence and remaining rank steps.</p>
  <ViewTabs label="War upgrade views" defaultTab={initialSide==="offense"?"Offense":"Defense"} tabs={[{label:"Defense",content:body("defense")},{label:"Offense",content:body("offense")}]}/>
  <ReferenceDetails label="Sources & ranking"><p>Defense snapshot: {reviewed.defense}. <a href="https://tacticus.xyz/wars/analyze/defenders" target="_blank" rel="noreferrer">Defender source</a>. Offense snapshot: {reviewed.offense}. <a href="https://tacticus.xyz/wars/analyze/attackers" target="_blank" rel="noreferrer">Attacker source</a>. Saved evidence, not live results; battlefield, map, opponent and ability levels can differ. Rates are not separated by Silver or Gold; these ranks are planning thresholds.</p>{defenseMetric?<p>{defenseMetric}</p>:null}<p>Requires all five characters to be owned and every selected core or flex cohort to have at least 100 recorded attacks. Ranking uses a 95% lower confidence bound and total rank steps, not estimated energy costs. Already-ready alternatives with equal or stronger evidence suppress redundant flex upgrades. Exact five-character records take precedence over a suggested combination of the same five. Characters appear once per team; shared characters can appear in other team projects.</p></ReferenceDetails>
 </div>;
}