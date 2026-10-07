"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import ResourceName,{ResourceText} from "../components/ResourceName";
import CollapsibleSection from "../components/CollapsibleSection";
import ReferenceDetails from "../components/ReferenceDetails";
import {onslaughtPriorities,readSectorChoices,SECTORS,type Alliance,type Sector,type SectorChoice,type OnslaughtCandidate} from "../../src/domain/onslaught";
import {progressionLabel} from "../../src/domain/characterProgression";
import {WAR_PLAN_STORAGE_KEY,warBadgeTargets,type WarBadgeTeam} from "../../src/domain/warBadgeTargets";
import type {OrbInventory} from "../../src/domain/orbPlanner";
import type {AbilityBadgeInventory} from "../../src/domain/badgeInventory";
import data from "../../data/game/onslaught.json";

export type HonorPrioritiesProps={candidates:OnslaughtCandidate[];orbs:OrbInventory|null;badges:AbilityBadgeInventory|null;defenseTeams:WarBadgeTeam[];offenseTeams:WarBadgeTeam[];accountKey:string};
export default function HonorPriorities({candidates,orbs,badges,defenseTeams,offenseTeams,accountKey}:HonorPrioritiesProps) {
 const [choices,setChoices]=useState<Partial<Record<Alliance,SectorChoice>>>({});
 const [loaded,setLoaded]=useState(false),[includeMythic,setIncludeMythic]=useState(false),[savedWar,setSavedWar]=useState<unknown>(null);
 const storageKey=`tacticus-onslaught-sectors-v1:${accountKey}`;
 useEffect(()=>{
  try{setChoices(readSectorChoices(JSON.parse(localStorage.getItem(storageKey)??"null")));}catch{setChoices({});}
  setLoaded(true);
  const readWar=()=>{try{setSavedWar(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedWar(null);}};
  readWar();window.addEventListener("storage",readWar);window.addEventListener("focus",readWar);
  return()=>{window.removeEventListener("storage",readWar);window.removeEventListener("focus",readWar);};
 },[storageKey]);
 const war=useMemo(()=>warBadgeTargets(defenseTeams,offenseTeams,savedWar,"war-both"),[defenseTeams,offenseTeams,savedWar]);
 const groups=useMemo(()=>onslaughtPriorities(candidates,orbs,badges,war,choices,includeMythic),[candidates,orbs,badges,war,choices,includeMythic]);
 const choose=(alliance:Alliance,choice:SectorChoice|undefined)=>{
  const next={...choices};if(choice)next[alliance]=choice;else delete next[alliance];
  setChoices(next);if(loaded)try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{/* Keep controls usable if storage is unavailable. */}
 };
 return <>
  <section className="panel detailPanel"><p><ResourceName id="onslaughtToken" name="Onslaught tokens"/> are shared across all three tracks: one attempt costs one token, one regenerates every 16 hours, normal cap 3.</p><p>Win, then honor one unit you deployed during that battle. A defeated character is still eligible. These are honor choices; take a team that can win.</p><label><input type="checkbox" checked={includeMythic} onChange={event=>setIncludeMythic(event.target.checked)}/> Include optional Mythic honor goals</label></section>
  {groups.map(group=>{
   const choice=choices[group.alliance];
   return <CollapsibleSection key={group.alliance} title={`${group.alliance} · top ${group.rows.length}`} summary={`Wave badges: ${group.waveBadges} · ${group.owned} owned characters`}>
    <div className="abilityViews"><label>{group.alliance} sector<select value={choice?.sector??""} onChange={event=>choose(group.alliance,event.target.value?{sector:event.target.value as Sector,tier:choice?.tier??1}:undefined)}><option value="">Unknown · choose in-game sector</option>{SECTORS.map(sector=><option key={sector} value={sector}>{sector[0]!.toUpperCase()+sector.slice(1)}</option>)}</select></label>{choice?<label>{group.alliance} sector stage<select value={choice.tier} onChange={event=>choose(group.alliance,{...choice,tier:Number(event.target.value) as SectorChoice["tier"]})}><option value={1}>I</option><option value={2}>II</option><option value={3}>III</option><option value={4}>Completed sector (III rewards)</option></select></label>:null}</div>
    {!group.deployable?<p className="sub">At least five owned characters from {group.alliance} are needed to enter this track. This roster has {group.owned}.</p>:null}
    <p className="sub">Wave clears and Eradication crates give {group.waveBadges} badges; honor rewards use {group.alliance}. {choice?"Sector is your manual selection; confirm it before each run.":"Sector is not exported by the API. Shard amounts stay unknown until you choose it."}</p>
    {group.rows.length?<div className="tableWrap"><table className="onslaughtTable" aria-label={`${group.alliance} honor priorities`}><thead><tr><th>Honor order</th><th>Why this character</th><th>Honor rewards / goal</th></tr></thead><tbody>{group.rows.map((row,index)=><tr key={row.id}>
     <td><strong>#{index+1}</strong><Link href={`/characters/${row.id}`}><CharacterName id={row.id} name={row.name}/></Link><small>{progressionLabel(row.progressionIndex)}</small></td>
     <td>{row.reasons.map(reason=><small key={reason}><ResourceText text={reason}/></small>)}<ReferenceDetails label="Priority evidence"><p>{row.utility.signals.join(" · ")||"No tracked utility signal; roster rarity goal only."}</p><p>{row.campaignShardSource?"Campaign shard sources exist in the synced catalog; check their access and costs.":"No repeatable campaign shard source in the synced catalog; other shops and event sources may exist."}</p><p>Alternatives share resource pools; these three choices do not reserve the same stock three times.</p></ReferenceDetails></td>
     <td><ResourceName id={row.reward.shardType==="Mythic"?"mythicShards":"shards"} name={`${row.reward.shards?row.reward.shards.min===row.reward.shards.max?row.reward.shards.min:`${row.reward.shards.min}–${row.reward.shards.max}`:"Amount unknown"} ${row.reward.shardType} shards`}/>
      {row.reward.orb?<small><ResourceName id={`orb:${group.alliance}:${row.reward.orb}`} name={`${group.alliance} ${row.reward.orb} orb`}/></small>:null}
      {row.reward.badges.map(rarity=><small key={rarity}><ResourceName id={`badge:${group.alliance}:${rarity}`} name={`${group.alliance} ${rarity} badge`}/></small>)}
      <small>Orb/badge chances depend on sector; preview rewards in-game.</small>
      {row.shardsNeeded>0?<small>{row.shardBalance??"?"} / {row.shardsNeeded} shards for next {row.progressionIndex>=15?"Mythic step":row.progressionIndex>=12?"optional star step":"rarity ascension"}</small>:null}
      {row.battles&&row.shardShortfall!>0?<small>{row.battles.min}–{row.battles.max} successful honors for missing shards at this sector; orb drops are separate.</small>:null}
      {row.progressionIndex>=12&&row.progressionIndex<=14?<small>Legendary already reached. Honor to collect shared resources; no extra-star orb spending is budgeted.</small>:null}
     </td>
    </tr>)}</tbody></table></div>:<p className="sub">No verified rarity, shard-ready orb or eligible badge goal needs honoring in this track. Optional Mythic goals can be enabled above.</p>}
   </CollapsibleSection>;
  })}
  <ReferenceDetails label="Current Onslaught rules and priority sources">
   <p>Reviewed {data.reviewedOn} · {data.rulesVersion}. Finished sectors can be replayed. Each alliance has separate sector progress and Eradication tiers; tokens are shared. Waves award badges and Tyranid Skulls. Eradication crates add <ResourceName id="gold"/>, badges, forge badges and <ResourceName id="gems"/>.</p>
   <p>Honor resource types follow the unit’s actual progression: an ascension boundary earns the next rarity’s orb; Legendary before the blue star earns Legendary badges and orbs. Blue-star Legendary and Mythic switch to Mythic shards and possible Mythic orbs, with Legendary/Mythic badges. Mythic wings no longer earns honor orbs. Shards are guaranteed after a win; their amount and orb/badge chances vary by played sector.</p>
   <p>Ranking is an account planning rule: known shard-ready orb shortages, rarity ascension work, eligible documented ability badges, then optional Mythic goals. Within a goal, selected Raid, unfinished Elite campaigns and active War slots come first, then usefulness; scarce campaign shard sources break ties. Covered rarity goals and unverified units are excluded. Unknown inventories are never treated as proven shortages. The list recalculates on account sync and follows saved Raid and active War choices.</p>
   <p>Machines of War can also be honored if deployed, but are outside these character priorities because machine investment goals are separately researched. A currently running Legendary event may keep regular shards unavailable until its final installment ends; check the event before promoting.</p>
   {data.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></p>)}
   <p><Link href="/orbs">Orb shopping totals</Link> · <Link href="/abilities">Badge budget</Link> · <Link href="/war-defense">Edit War teams</Link></p>
  </ReferenceDetails>
 </>;
}
