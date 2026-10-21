"use client";
import RarityBadge from "../components/RarityBadge";

import ResourceName,{ResourceText} from "../components/ResourceName";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import AllianceTabs from "../components/AllianceTabs";
import CollapsibleSection from "../components/CollapsibleSection";
import ReferenceDetails from "../components/ReferenceDetails";
import {orbPlan,orbUpgradeAction,shardReadyOrbPlan,combinedOrbDemand,orbHonorees,orbsOwned,normalizeAlliance,type OrbCandidate,type OrbInventory,type OrbScope} from "../../src/domain/orbPlanner";
import ProgressionBadge from "../components/ProgressionBadge";
import {CHARACTER_RARITIES,type CharacterRarity} from "../../src/domain/characterProgression";
import {WAR_PLAN_STORAGE_KEY,warBadgeTargets,type WarBadgeTeam} from "../../src/domain/warBadgeTargets";
import {currencyName,scheduleLabel,isActionableOffer,type ShopCatalog} from "../../src/domain/shops";
import sources from "../../config/orb_sources.json";

export type OrbPlannerProps={candidates:OrbCandidate[];inventory:OrbInventory|null;defenseTeams:WarBadgeTeam[];offenseTeams:WarBadgeTeam[];shops:ShopCatalog};
export default function OrbPlanner({candidates,inventory,defenseTeams,offenseTeams,shops}:OrbPlannerProps){
 const [scope,setScope]=useState<OrbScope>("priorities");
 const [horizon,setHorizon]=useState<"next"|"goal">("next");
 const [includeMythic,setIncludeMythic]=useState(false);
 const [includeStarUpgrades,setIncludeStarUpgrades]=useState(false);
 const [includeShardBlocked,setIncludeShardBlocked]=useState(false);
 const [allReady,setAllReady]=useState(false);
 const [savedPlan,setSavedPlan]=useState<unknown>(null);
 useEffect(()=>{const read=()=>{try{setSavedPlan(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedPlan(null);}};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 const warTargets=useMemo(()=>warBadgeTargets(defenseTeams,offenseTeams,savedPlan,"war-both"),[defenseTeams,offenseTeams,savedPlan]);
 const planAll=useMemo(()=>orbPlan(candidates,inventory,warTargets,{scope,horizon,includeMythic,includeStarUpgrades,includeShardBlocked}),[candidates,inventory,warTargets,scope,horizon,includeMythic,includeStarUpgrades,includeShardBlocked]);
 const readyAll=useMemo(()=>shardReadyOrbPlan(candidates,inventory,warTargets,includeMythic,includeStarUpgrades,allReady?"all":"priorities"),[candidates,inventory,warTargets,includeMythic,includeStarUpgrades,allReady]);
 const protectedDemand=useMemo(()=>combinedOrbDemand(planAll,readyAll),[planAll,readyAll]);
 const orbOffers=(rarity:string)=>shops.shops.filter(shop=>shop.coverage==="catalog").flatMap(shop=>shop.offers.filter(offer=>offer.itemId===`draft_ascensionOrbs${rarity}`&&isActionableOffer(offer)).map(offer=>({shop,offer})));
 const acquisition=(pool:typeof planAll.pools[number],label=`Get ${pool.alliance} ${pool.rarity} orbs`)=>{
  const offers=orbOffers(pool.rarity);
  const forge=sources.forge.offers.find(offer=>offer.rarity===pool.rarity);
  const lowerOwned=forge?orbsOwned(inventory,pool.alliance,forge.lower as CharacterRarity):null;
  const lowerNeeded=forge?protectedDemand.get(`${pool.alliance}:${forge.lower}`)??0:0;
  const forgeCount=lowerOwned===null||pool.shortfall===null?null:Math.min(pool.shortfall,Math.floor(Math.max(0,lowerOwned-lowerNeeded)/5));
  const honorees=orbHonorees(candidates,pool.alliance,pool.rarity);
  return <ReferenceDetails label={label}>
   {offers.map(({shop,offer})=><p key={offer.id}><a href={shop.sourceUrl} target="_blank" rel="noreferrer">{shop.name}</a>: <ResourceName id={`draft_ascensionOrbs${pool.rarity}`} name={`${offer.quantity} draft orb${offer.quantity===1?"":"s"}`}/> for <ResourceName id={offer.cost.currency} name={`${offer.cost.amount.toLocaleString()} ${currencyName(offer.cost.currency)}`}/> · {scheduleLabel(offer.schedule)}{offer.maxPurchases!==null?` · catalog limit ${offer.maxPurchases} purchases`:""}.{pool.shortfall!==null&&pool.shortfall>0?` Cover ${pool.shortfall} short with ${Math.ceil(pool.shortfall/offer.quantity)} pack(s): ${(Math.ceil(pool.shortfall/offer.quantity)*offer.cost.amount).toLocaleString()} ${currencyName(offer.cost.currency)}.`:""} {shop.id==="rogue"?"Requires Rogue Trader access (Legendary star or higher).":"Check shop access and stock in-game."} Choose {pool.alliance}. {offer.conditions.lockId?"Offer lock needs in-game verification.":""}</p>)}
   {<p><a href={sources.sources[0]!.url} target="_blank" rel="noreferrer">Onslaught</a>: {honorees.length?`Current orb-producing honorees: ${honorees.join(", ")}.`:`No confirmed ${pool.alliance} ${pool.rarity}-orb honouree at the required stage in this roster.`} Preview sector reward/chance; deploy and honour the chosen unit. <Link href="/onslaught">Your top honor choices</Link></p>}
   {pool.rarity==="Mythic"?<p><a href={sources.sources[2]!.url} target="_blank" rel="noreferrer">Mythic Journey</a>: check each recipient’s mission chain for first Mythic ascension at Legendary star before buying or forging.</p>:null}
   {forge?<p><a href={sources.forge.url} target="_blank" rel="noreferrer">Forge</a>: <ResourceText text={`each ${pool.alliance} ${pool.rarity} orb costs 5 ${pool.alliance} ${forge.lower} orbs, 1 ${pool.rarity} forge badge and ${forge.coins.toLocaleString()} coins.`}/> {forgeCount===null?"Sync inventory to calculate spare lower-rarity orbs.":forgeCount>0?`After reserving this plan, spare lower orbs could make ${forgeCount}: ${forgeCount*5} lower orbs, ${forgeCount} forge badges and ${(forgeCount*forge.coins).toLocaleString()} coins. Check badges and coins before forging.`:"No forgeable shortfall from spare lower orbs after this plan’s reservations."}</p>:<p>Uncommon orbs cannot be forged.</p>}
  </ReferenceDetails>;
 };
 return <>
  <div className="abilityViews"><label className="checkLabel"><input type="checkbox" checked={includeStarUpgrades} onChange={event=>setIncludeStarUpgrades(event.target.checked)}/> Include star upgrades within a rarity</label><label className="checkLabel"><input type="checkbox" checked={includeMythic} onChange={event=>setIncludeMythic(event.target.checked)}/> Include Mythic upgrades</label><label className="checkLabel"><input type="checkbox" checked={allReady} onChange={event=>setAllReady(event.target.checked)}/> Show all shard-ready characters</label></div>
  {planAll.unknown.length?<p className="sub">Progression or alliance needs review: {planAll.unknown.join(", ")}. These units are excluded from totals.</p>:null}
  {!inventory?<p className="sub">Orb inventory unavailable. Sync Account to calculate owned amounts, allocations and shortages.</p>:null}
  <AllianceTabs label="Orb alliance">{alliance=>{
   const names=new Set(candidates.filter(row=>normalizeAlliance(row.alliance)===alliance).map(row=>row.name));
   const ready={...readyAll,rows:readyAll.rows.filter(row=>row.alliance===alliance),pools:readyAll.pools.filter(pool=>pool.alliance===alliance),unknownShards:readyAll.unknownShards.filter(name=>names.has(name)),waitingForShards:readyAll.waitingForShardNames.filter(name=>names.has(name)).length};
   const plan={...planAll,rows:planAll.rows.filter(row=>row.alliance===alliance),pools:planAll.pools.filter(pool=>pool.alliance===alliance),deferred:planAll.deferred.filter(name=>names.has(name))};
   const rarityGroups=CHARACTER_RARITIES.map(rarity=>({rarity,pools:ready.pools.filter(pool=>pool.rarity===rarity),rows:ready.rows.filter(row=>row.next.orbRarity===rarity)})).filter(group=>group.rows.length>0);
   return <>
  <CollapsibleSection title="Shard-ready orb shopping list" summary={`${ready.rows.length} characters have the shards · ${ready.waitingForShards} still collecting shards`}>
   <p className="sub">Shards covered · check coins before upgrading. {allReady?"Includes optional bench upgrades.":""}</p>
   {rarityGroups.map(group=><CollapsibleSection key={group.rarity} label={`${group.rarity} orbs`} title={<><RarityBadge rarity={group.rarity}/> orbs</>} summary={`${group.rows.length} characters · ${group.pools.reduce((total,pool)=>total+pool.needed,0)} orbs needed`}>
    <div className="tableWrap"><table aria-label={`${group.rarity} orb shopping`}><thead><tr><th>Alliance</th><th>Characters</th><th>Owned</th><th>Needed</th><th>Short</th></tr></thead><tbody>{group.pools.map(pool=><tr key={pool.alliance}>
     <td><strong><ResourceName id={`orb:${pool.alliance}:${pool.rarity}`} name={pool.alliance}/></strong>{acquisition(pool,"Sources")}</td>
     <td><div className="orbRecipients">{group.rows.filter(row=>row.alliance===pool.alliance).map(row=>{
      const cost=row.allocations[0]!;
      return <div key={row.id}><Link href={`/characters/${row.id}`}><CharacterName id={row.id} name={row.name}/></Link>{cost.needed!==10?<small>{cost.needed} orbs</small>:null}{row.next.promotions>0?<small>Promote {row.next.promotions} time{row.next.promotions===1?"":"s"} first</small>:null}</div>;
     })}</div></td>
     <td>{pool.owned??"Unknown"}</td><td>{pool.needed}</td><td><strong>{pool.shortfall??"Unknown"}</strong></td>
    </tr>)}</tbody></table></div>
   </CollapsibleSection>)}
   {!rarityGroups.length?<p>No shard-ready orb upgrades{includeMythic?"":" below Mythic"}.</p>:null}
   {ready.unknownShards.length?<p className="sub">Shard inventory unknown: {ready.unknownShards.join(", ")} · excluded from ready totals.</p>:null}
  </CollapsibleSection>
  <CollapsibleSection title="Longer-term orb plan" summary={`${plan.rows.length} ${includeShardBlocked?"projected":"shard-covered"} characters · ${plan.deferred.length} still need shards`} defaultOpen={false}>
  <div className="abilityViews">
   <label>Include<select value={scope} onChange={event=>setScope(event.target.value as OrbScope)}><option value="priorities">Account priorities</option><option value="raid">Main Raid team</option><option value="campaign">Campaign targets</option><option value="war">Active War teams</option><option value="all">All owned characters</option></select></label>
   <label>Plan<select value={horizon} onChange={event=>setHorizon(event.target.value as "next"|"goal")}><option value="next">Next orb upgrade</option><option value="goal">Through target rarity</option></select></label>
   <label className="checkLabel"><input type="checkbox" checked={includeShardBlocked} onChange={event=>setIncludeShardBlocked(event.target.checked)}/> Include characters still collecting shards</label>
  </div>
  {includeShardBlocked?<p className="sub">Includes upgrades that still need shards. Collect those first.</p>:null}
  <h2>Orbs needed</h2>
  <div className="tableWrap"><table><thead><tr><th>Orbs</th><th>Owned</th><th>Needed</th><th>Short</th><th>For whom / where</th></tr></thead><tbody>{plan.pools.map(pool=><tr key={`${pool.alliance}:${pool.rarity}`}><td><strong><ResourceName id={`orb:${pool.alliance}:${pool.rarity}`} name={`${pool.alliance} · ${pool.rarity}`}/></strong></td><td>{pool.owned??"Unknown"}</td><td>{pool.needed}</td><td><strong>{pool.shortfall??"Unknown"}</strong></td><td>{pool.recipients.join(", ")}{acquisition(pool)}</td></tr>)}</tbody></table></div>
  <h2>Upgrades · {plan.rows.length} characters</h2>
  {plan.rows.length?<div className="tableWrap"><table aria-label="Orb upgrade priorities"><thead><tr><th>Character</th><th>Upgrade</th><th>Orbs needed</th><th>Next step</th></tr></thead><tbody>{plan.rows.map((row,index)=>{
   return <tr key={row.id}><td><Link href={`/characters/${row.id}`}><CharacterName id={row.id} name={row.name}/></Link><small>#{index+1}</small><ReferenceDetails label="Details"><p>{row.reasons.map(reason=>reason==="Manual full-roster scope"?"Optional roster upgrade":reason).join(" · ")}</p><p>{row.utility.signals.join(" · ")}</p>{row.goalIndex!==row.end?<p>Longer-term target: <ProgressionBadge index={row.goalIndex}/></p>:null}{row.allocations.map(cost=><p key={cost.rarity}>{cost.needed} {cost.rarity} orbs · {cost.reserved??"?"} set aside · {cost.shortfall??"?"} still needed</p>)}</ReferenceDetails></td>
    <td><ProgressionBadge index={row.progressionIndex}/> → <strong><ProgressionBadge index={row.end}/></strong>{row.next.promotions>0?<small>Promote {row.next.promotions} time{row.next.promotions===1?"":"s"} first.</small>:null}</td>
    <td>{row.allocations.map(cost=><small key={cost.rarity}><strong><ResourceName id={`orb:${row.alliance}:${cost.rarity}`} name={`${cost.needed} ${cost.rarity}`}/></strong> · {cost.shortfall===null?"Balance unknown":cost.shortfall>0?`${cost.shortfall} short`:"Covered"}</small>)}</td>
    <td>{row.shardsNeeded>0?<small><ResourceName id="shards" name={`${row.shards??"?"} / ${row.shardsNeeded} shards`}/></small>:null}{row.mythicShardsNeeded>0?<small><ResourceName id="mythicShards" name={`${row.mythicShards??"?"} / ${row.mythicShardsNeeded} Mythic shards`}/></small>:null}
     <strong>{orbUpgradeAction(row)}</strong></td></tr>;
  })}</tbody></table></div>:<p className="sub">No upgrades with enough shards. Enable characters still collecting shards to see future costs.</p>}
  </CollapsibleSection>
  </>;}}</AllianceTabs>
  <ReferenceDetails label="Priority rules and sources"><p>Selected Raid core, selected flex, unfinished campaign targets, active War slots, then general usefulness. Within each group, characters at an orb spend come first, followed by community score and account priority. This is an editable planning scope, not a damage forecast. Each shared pool is reserved once in queue order. Shard-blocked costs are excluded unless future estimates are explicitly enabled.</p><p>Raid members target Legendary as a first floor. Extra stars within Legendary/Mythic are excluded unless enabled; Mythic ascension is separately optional. Campaign floors follow recorded rank and ability targets; missing completion is labelled unknown. War Silver targets Rare and Gold targets Epic; War goals exclude reserves and capped members. Bench Core/Strong characters target Legendary and Useful characters target Epic. All-owned scope includes each character’s next rarity ascension, with extra star spends available through the toggle.</p><p>War uses this browser’s saved plan, with the War planner’s default distinct teams when none is saved. <Link href="/war-defense">Edit War teams</Link> · <Link href="/guild-raid">Edit main Raid team</Link> · <Link href="/campaigns">Review campaign targets</Link></p><p><a href={sources.progression.url} target="_blank" rel="noreferrer">Progression costs</a> · <a href={sources.progression.indexSource} target="_blank" rel="noreferrer">API star mapping</a> · reviewed {sources.reviewedOn}. Shop catalog checked {shops.reviewedAt.slice(0,10)}. Prices and schedules describe catalog offers; access, current stock, currencies and mission progress require an in-game check. Orb totals exclude ascension coins, shard acquisition and lower-orb conversions. The shard-ready queue follows account priorities by default. The optional full-roster audit also includes bench and capped War units. Both cover each character’s next orb spend. Both views require the full shard path by default; the longer-term plan can optionally show shard-blocked projections. Do not add their totals together. Forge suggestions protect both queues, counting each character’s overlapping demand once.</p>{sources.sources.map(source=><p key={source.name}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>: {source.note}</p>)}<p>{sources.forge.note}</p><p>Reward references: {sources.rewardReferences.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer">{index?" · ":""}{url.split("/").at(-1)?.replaceAll("_"," ")}</a>)}</p></ReferenceDetails>
 </>;
}
