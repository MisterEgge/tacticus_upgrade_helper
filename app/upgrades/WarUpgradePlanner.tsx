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
import {warUpgradeRecommendations,warUpgradeAssignments,warUpgradeReassignments,type WarSide,type WarUpgradeSource,type WarUpgradeUnit,type WarUpgradeRecommendation} from "../../src/domain/warUpgrades";

type Props={roster:WarUpgradeUnit[];sources:WarUpgradeSource[];defaults:Record<WarSide,string[][]>;reviewed:Record<WarSide,string>;defenseMetric?:string};
export default function WarUpgradePlanner({roster,sources,defaults,reviewed,defenseMetric}:Props){
    const [tier,setTier]=useState<"silver"|"gold">("silver");
    const [query,setQuery]=useState("");
    const [saved,setSaved]=useState<unknown>(null);
    const [expanded,setExpanded]=useState(false);
    useEffect(()=>{const read=()=>{try{setSaved(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSaved(null);}};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
    const recommendations=useMemo(()=>({defense:warUpgradeRecommendations(roster,sources,tier,"defense"),offense:warUpgradeRecommendations(roster,sources,tier,"offense")}),[roster,sources,tier]);
    const byId=new Map(roster.map(unit=>[unit.id,unit]));
    const target= tier==="silver"?9:12;
    const requiredRarity=rarityForGoal(target,null);
    const body=(side:WarSide)=>{
        const matching=recommendations[side].filter(row=>row.unit.name.toLowerCase().includes(query.trim().toLowerCase()));
        const rows=expanded?matching:matching.slice(0,8);
        const other=new Set(recommendations[side==="defense"?"offense":"defense"].map(row=>row.unit.id));
        const assignments=warUpgradeAssignments(saved,side,defaults[side],new Set(byId.keys()));
        const evidence=(row:WarUpgradeRecommendation)=>`${row.plan.rate.toFixed(1)}% ${row.plan.kind==="lineup"?"lineup wins":side==="defense"?"core holds":"core wins"}`;
        return <section className="panel warUpgradePanel" aria-label={`${side==="defense"?"Defense":"Offense"} upgrade opportunities`}>
            {rows.length?<div className="tableWrap"><table className="warUpgradeTable"><thead><tr><th>Character</th><th>Current</th><th>Target</th><th>Team opportunity</th><th>Next step</th></tr></thead><tbody>{rows.map(row=>{
                const others=row.plan.blockers.filter(id=>id!==row.unit.id);
                const changes=warUpgradeReassignments(row.plan,assignments);
                const rarityGate=CHARACTER_RARITIES.indexOf(row.unit.rarity as typeof CHARACTER_RARITIES[number])<CHARACTER_RARITIES.indexOf(requiredRarity);
                return <tr key={row.unit.id}>
                    <td data-label="Character"><Link href={`/characters/${row.unit.id}`}><CharacterName id={row.unit.id} name={row.unit.name}/></Link>{other.has(row.unit.id)?<small>Also helps {side==="defense"?"offense":"defense"}</small>:null}</td>
                    <td data-label="Current"><RankBadge rank={row.unit.rank}/></td>
                    <td data-label="Target"><RankBadge rank={row.targetRank}/>{rarityGate?<small><RarityBadge rarity={requiredRarity}/> required</small>:null}</td>
                    <td data-label="Team opportunity"><strong>{others.length?`${others.length} teammate${others.length===1?"":"s"} also need upgrades`:"Completes this lineup's rank requirements"}</strong><small>{evidence(row)} · {row.plan.used.toLocaleString()} attacks</small>
                        <ReferenceDetails label={`Team for ${row.unit.name}`}>
                            <div className="warUpgradeLineup">{row.plan.members.map(id=>{const unit=byId.get(id)!,flex=row.plan.flex.find(choice=>choice.id===id);return <div className={unit.rank<row.targetRank?"warUpgradeNeeds":""} key={id}><Link href={`/characters/${id}`}><CharacterPortrait id={id} name={unit.name}/><span>{unit.name}</span></Link>{unit.rank<row.targetRank?<RankBadge rank={unit.rank}/>:<small>Rank ready</small>}{row.plan.kind==="core"?<small>{flex?`Flex · ${flex.rate.toFixed(1)}% / ${flex.used.toLocaleString()}`:"Core"}</small>:null}</div>;})}</div>
                            {others.length?<p>All highlighted teammates must reach <RankBadge rank={row.targetRank}/> before this lineup meets the rank target.</p>:null}
                            {row.plan.kind==="core"?<p>The rate above describes the core trio. Individual flex cohorts overlap and are not a measured result for these five together.</p>:<p>The source recorded this exact five-character lineup.</p>}
                            {changes?<p>Uses characters from {changes} current {side} lineup{changes===1?"":"s"}; reassign them in the <Link href="/war-defense">War planner</Link>. They cannot appear twice on the same side.</p>:null}
                            <p>Alternative plans, not an extra team to add alongside every other suggestion. Check abilities, gear and deployment in the War planner before assigning.</p>
                        </ReferenceDetails>
                    </td>
                    <td data-label="Next step"><Link href={`/farming?character=${row.unit.id}&target=${row.targetRank}`}>Plan materials</Link></td>
                </tr>;
            })}</tbody></table></div>:<p className="warUpgradeEmpty">{query.trim()?"No matching characters in these opportunities.":"No owned source-backed rank upgrades found for this target. Try the other rank or War side."}</p>}
            {!expanded&&matching.length>8?<button className="warUpgradeMore" type="button" onClick={()=>setExpanded(true)}>Show all {matching.length} characters</button>:null}
        </section>;
    };
    return <div className="warUpgradeWorkspace"><div className="abilityViews"><label>Build for<select aria-label="War upgrade target" value={tier} onChange={event=>{setTier(event.target.value as "silver"|"gold");setExpanded(false);}}><option value="silver">Silver I lineups</option><option value="gold">Gold I lineups</option></select></label><label>Character<input type="search" aria-label="Find upgrade character" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search characters"/></label></div>
        <p className="sub">Ordered by sample-aware team evidence and all five characters' remaining rank steps. Recorded rates describe the source, not a promised win increase.</p>
        <ViewTabs label="War upgrade views" defaultTab="Defense" tabs={[{label:"Defense",content:body("defense")},{label:"Offense",content:body("offense")}]}/>
        <ReferenceDetails label="Sources & ranking"><p>Defense snapshot: {reviewed.defense}. <a href="https://tacticus.xyz/wars/analyze/defenders" target="_blank" rel="noreferrer">Defender source</a>. Offense snapshot: {reviewed.offense}. <a href="https://tacticus.xyz/wars/analyze/attackers" target="_blank" rel="noreferrer">Attacker source</a>. Saved evidence, not live results; battlefield, map, opponent and ability levels can differ. Rates are not separated by Silver or Gold; these ranks are planning thresholds.</p>{defenseMetric?<p>{defenseMetric}</p>:null}<p>Requires all five characters to be owned and every selected core or flex cohort to have at least 100 recorded attacks. Ranking uses a 95% lower confidence bound and total rank steps, not estimated energy costs. Already-ready alternatives with equal or stronger evidence suppress redundant flex upgrades. Exact five-character records take precedence over a suggested combination of the same five. A character appears once per view; alternatives share characters and cannot be added together as extra teams.</p></ReferenceDetails>
    </div>;
}
