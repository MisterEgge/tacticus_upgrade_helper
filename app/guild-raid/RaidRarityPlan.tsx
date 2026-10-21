import Link from "next/link";
import CharacterName from "../components/CharacterName";
import ProgressionBadge from "../components/ProgressionBadge";
import ResourceName from "../components/ResourceName";
import ReferenceDetails from "../components/ReferenceDetails";
import RankText from "../components/RankText";
import {raidRarityPlan} from "../../src/domain/raidRarityPlan";
import type {RoadmapCheckpoint} from "../../src/domain/laviscusRoadmap";
import type {RaidUpgradeMember} from "../../src/domain/raidRoadmap";
import type {OrbInventory} from "../../src/domain/orbPlanner";
import type {RosterUnit} from "../lib/report";
import priorities from "../../config/raid_rarity_priorities.json";
const missing=(amount:number|null)=>amount===0?"":` · ${amount??"?"} missing`;

export default function RaidRarityPlan({roster,members,checkpoints,inventory}:{roster:RosterUnit[];members:RaidUpgradeMember[];checkpoints:RoadmapCheckpoint[];inventory:OrbInventory|null|undefined}){
 const plan=raidRarityPlan(members,roster,checkpoints,inventory);
 if(!plan.rows.length&&!plan.invalid.length)return null;
 return <section className="raidRarityPlan" aria-label="Raid rarity upgrades"><h3>Rarity upgrades</h3><p className="sub">Follow this order within each alliance. Imperial, Chaos and Xenos orbs can progress in parallel.</p>
  {plan.invalid.length?<p role="status">Sync progression data for {plan.invalid.join(", ")} to plan promotions.</p>:null}
  {plan.rows.length?<div className="tableWrap"><table aria-label="Raid rarity priority"><thead><tr><th>Priority / character</th><th>Next promotion</th><th>Next spend / action</th><th>When to push rarity</th></tr></thead><tbody>{plan.rows.map((row,index)=><tr key={row.unit.id}>
   <td><Link className="characterLink" href={`/characters/${encodeURIComponent(row.unit.id)}#progression`}><CharacterName name={row.unit.name} id={row.unit.id}/></Link><small>#{index+1} · {row.alliance}</small></td>
   <td><ProgressionBadge index={row.unit.progressionIndex}/> → <ProgressionBadge index={row.next.to}/></td>
   <td>{row.next.shards>0?<small><ResourceName id="shards" name={`${row.next.shards} shards${missing(row.shardShortfall)}`}/></small>:null}{row.next.mythicShards>0?<small><ResourceName id="mythicShards" name={`${row.next.mythicShards} Mythic shards${missing(row.mythicShortfall)}`}/></small>:null}<small><ResourceName id={`orb:${row.alliance}:${row.next.orbRarity}`} name={`${row.next.orbs} ${row.alliance} ${row.next.orbRarity} orbs${missing(row.orbShortfall)}`}/></small><strong>{row.action}</strong>{row.next.orbRarity==="Mythic"?<Link className="sourceLink" href="https://tacticus.wiki.gg/wiki/Mythic_Missions" target="_blank" rel="noreferrer">Complete Mythic Journey</Link>:null}</td>
   <td><RankText text={row.timing}/><ReferenceDetails label="Goal and full cost"><p>{row.reason}</p><p>Remaining path to {row.goal===12?"Legendary":"first Mythic"}, before spending:</p>{row.totalShards>0?<p><ResourceName id="shards" name={`${row.totalShards} regular shards · ${row.totalShardShortfall??"?"} missing`}/></p>:null}{row.totalMythicShards>0?<p><ResourceName id="mythicShards" name={`${row.totalMythicShards} Mythic shards · ${row.totalMythicShortfall??"?"} missing`}/></p>:null}{Object.entries(row.costs).map(([rarity,amount])=><p key={rarity}><ResourceName id={`orb:${row.alliance}:${rarity}`} name={`${amount} ${row.alliance} ${rarity} orbs total`}/></p>)}{row.goal===16?<p>At Legendary blue star, check the Mythic Journey mission chain before buying Mythic resources. Mission progress and coins are not included in the export.</p>:null}</ReferenceDetails></td>
  </tr>)}</tbody></table></div>:null}
  <ReferenceDetails label="Rarity priority sources"><p>{plan.profile?priorities.basis:"Order follows the selected roadmap's rarity gates. Character-specific Mythic priorities for this lineup need research."} The Diamond III / level-50 timing is a planning default, not an ascension requirement; earlier ascension may help if survival blocks raids. Only the next shard-ready spend reserves orbs; full-path totals are future costs, not additional reservations. Other app queues are alternative plans and should not be added to this one.</p><p>Reviewed {priorities.reviewedOn}. First Mythic is the stopping point here; extra Mythic stars are separate late investment.</p>{priorities.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}</ReferenceDetails>
 </section>;
}
