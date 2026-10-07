"use client";
import ResourceName,{ResourceText} from "../../components/ResourceName";
import {useState} from "react";
import Link from "next/link";
import {characterAscension} from "../../../src/domain/characterAscension";
import {nextOrbMilestone} from "../../../src/domain/characterProgression";
import {RANK_NAMES,rankName} from "../../../src/domain/ranks";
import {ascensionAction} from "../../lib/characterUpgradeSummary";
import type {RosterUnit} from "../../lib/report";
import type {OrbInventory} from "../../../src/domain/orbPlanner";
import ReferenceDetails from "../../components/ReferenceDetails";

export default function CharacterProgression({unit,inventory}:{unit:RosterUnit;inventory:OrbInventory|null|undefined}) {
 const [stars,setStars]=useState(false);
 const progress={progressionIndex:unit.progressionIndex,alliance:unit.grandAlliance,shards:unit.shards,mythicShards:unit.mythicShards};
 const plan=characterAscension(progress,inventory,stars),action=ascensionAction(plan),next=nextOrbMilestone(unit.progressionIndex);
 const validRank=Number.isInteger(unit.rank)&&unit.rank>=0&&unit.rank<RANK_NAMES.length-1;
 return <section className="panel characterProgress" aria-label="Rank and ascension" id="progression">
  <div><strong>Rank</strong>{validRank?<Link className="sourceLink" href={`/farming?character=${encodeURIComponent(unit.id)}&target=${unit.rank+1}`}>Farm {rankName(unit.rank+1)} upgrades</Link>:<span>Rank planning needs review or is complete</span>}</div>
  <div><strong>{plan.state==="OPTIONAL"?`${unit.rarity} rarity reached`:action.label}</strong>
   {plan.state==="OPTIONAL"?<label><input type="checkbox" checked={stars} onChange={event=>setStars(event.target.checked)}/> Show optional star upgrade</label>:<><span><ResourceText text={action.detail}/></span>{plan.orbsNeeded?<Link className="sourceLink" href="/orbs">Orb totals and stores</Link>:null}{stars?<label><input type="checkbox" checked={stars} onChange={event=>setStars(event.target.checked)}/> Show optional star upgrade</label>:null}</>}
   {plan.state!=="OPTIONAL"&&plan.state!=="MAXED"?<ReferenceDetails label="Ascension costs and balances"><p><ResourceName id={plan.shardType==="Mythic"?"mythicShards":"shards"} name={`${plan.shardsNeeded} ${plan.shardType==="Mythic"?"Mythic ":""}shards`}/> needed · {plan.shardsOwned??"Unknown"} owned{plan.orbsNeeded?<> · <ResourceName id={`orb:${plan.alliance}:${plan.orbRarity}`} name={`${plan.orbsNeeded} ${plan.alliance} ${plan.orbRarity} orbs`}/> needed · {plan.orbsOwned??"Unknown"} owned</>:null}.</p>{next?.promotions?<p>After {next.promotions} shard-only promotion(s), the next orb spend needs {next.shards||next.mythicShards} total {next.mythicShards?"Mythic ":""}shards and {next.orbs} {plan.alliance} {next.orbRarity} orbs.</p>:null}<p>Orb stock is shared. Use the Orb planner to budget multiple characters; check coins in-game.</p></ReferenceDetails>:null}
  </div>
 </section>;
}
