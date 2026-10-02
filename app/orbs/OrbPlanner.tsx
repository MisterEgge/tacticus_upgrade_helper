"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import ReferenceDetails from "../components/ReferenceDetails";
import {orbPlan,orbHonorees,orbsOwned,type OrbCandidate,type OrbInventory,type OrbScope} from "../../src/domain/orbPlanner";
import {progressionLabel,progressionStep,type CharacterRarity} from "../../src/domain/characterProgression";
import {WAR_PLAN_STORAGE_KEY,warBadgeTargets,type WarBadgeTeam} from "../../src/domain/warBadgeTargets";
import {currencyName,scheduleLabel,type ShopCatalog} from "../../src/domain/shops";
import sources from "../../config/orb_sources.json";

export type OrbPlannerProps={candidates:OrbCandidate[];inventory:OrbInventory|null;defenseTeams:WarBadgeTeam[];offenseTeams:WarBadgeTeam[];shops:ShopCatalog};
export default function OrbPlanner({candidates,inventory,defenseTeams,offenseTeams,shops}:OrbPlannerProps){
 const [scope,setScope]=useState<OrbScope>("priorities");
 const [horizon,setHorizon]=useState<"next"|"goal">("next");
 const [includeMythic,setIncludeMythic]=useState(false);
 const [savedPlan,setSavedPlan]=useState<unknown>(null);
 useEffect(()=>{const read=()=>{try{setSavedPlan(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedPlan(null);}};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 const warTargets=useMemo(()=>warBadgeTargets(defenseTeams,offenseTeams,savedPlan,"war-both"),[defenseTeams,offenseTeams,savedPlan]);
 const plan=useMemo(()=>orbPlan(candidates,inventory,warTargets,{scope,horizon,includeMythic}),[candidates,inventory,warTargets,scope,horizon,includeMythic]);
 const acquisition=(pool:typeof plan.pools[number])=>{
  const offers=shops.shops.flatMap(shop=>shop.offers.filter(offer=>offer.itemId===`draft_ascensionOrbs${pool.rarity}`).map(offer=>({shop,offer})));
  const daily=sources.dailyShop.offers.find(offer=>offer.rarity===pool.rarity);
  const forge=sources.forge.offers.find(offer=>offer.rarity===pool.rarity);
  const lowerOwned=forge?orbsOwned(inventory,pool.alliance,forge.lower as CharacterRarity):null;
  const lowerNeeded=forge?plan.pools.find(other=>other.alliance===pool.alliance&&other.rarity===forge.lower)?.needed??0:0;
  const forgeCount=lowerOwned===null||pool.shortfall===null?null:Math.min(pool.shortfall,Math.floor(Math.max(0,lowerOwned-lowerNeeded)/5));
  const honorees=orbHonorees(candidates,pool.alliance,pool.rarity);
  return <ReferenceDetails label={`Get ${pool.alliance} ${pool.rarity} orbs`}>
   {offers.map(({shop,offer})=><p key={offer.id}><a href={shop.sourceUrl} target="_blank" rel="noreferrer">{shop.name}</a>: {offer.quantity} draft orb{offer.quantity===1?"":"s"} for {offer.cost.amount.toLocaleString()} {currencyName(offer.cost.currency)} · {scheduleLabel(offer.schedule)}{offer.maxPurchases!==null?` · catalog limit ${offer.maxPurchases} purchases`:""}.{pool.shortfall!==null&&pool.shortfall>0?` Cover ${pool.shortfall} short with ${Math.ceil(pool.shortfall/offer.quantity)} pack(s): ${(Math.ceil(pool.shortfall/offer.quantity)*offer.cost.amount).toLocaleString()} ${currencyName(offer.cost.currency)}.`:""} {shop.id==="rogue"?"Requires Rogue Trader access (Legendary star or higher).":"Check shop access and stock in-game."} Choose {pool.alliance}. {offer.conditions.lockId?"Offer lock needs in-game verification.":""}</p>)}
   {daily?<p><a href={sources.dailyShop.url} target="_blank" rel="noreferrer">Daily Deals</a>: {daily.quantity} draft orbs for {daily.blackstone} Blackstone when offered. Choose {pool.alliance}; stock and rarity vary.</p>:null}
   {<p><a href={sources.sources[0]!.url} target="_blank" rel="noreferrer">Onslaught</a>: {honorees.length?`Current orb-producing honorees: ${honorees.join(", ")}.`:`No confirmed ${pool.alliance} ${pool.rarity}-orb honouree at the required stage in this roster.`} Preview sector reward/chance; deploy and honour the chosen unit.</p>}
   {pool.rarity==="Mythic"?<p><a href={sources.sources[2]!.url} target="_blank" rel="noreferrer">Mythic Journey</a>: check each recipient’s mission chain for first Mythic ascension at Legendary star before buying or forging.</p>:null}
   {forge?<p><a href={sources.forge.url} target="_blank" rel="noreferrer">Forge</a>: each {pool.rarity} orb costs 5 {pool.alliance} {forge.lower} orbs, 1 {pool.rarity} forge badge and {forge.coins.toLocaleString()} coins. {forgeCount===null?"Sync inventory to calculate spare lower-rarity orbs.":forgeCount>0?`After reserving this plan, spare lower orbs could make ${forgeCount}: ${forgeCount*5} lower orbs, ${forgeCount} forge badges and ${(forgeCount*forge.coins).toLocaleString()} coins. Check badges and coins before forging.`:"No forgeable shortfall from spare lower orbs after this plan’s reservations."}</p>:<p>Uncommon orbs cannot be forged.</p>}
  </ReferenceDetails>;
 };
 return <>
  <div className="abilityViews">
   <label>Include<select value={scope} onChange={event=>setScope(event.target.value as OrbScope)}><option value="priorities">Account priorities</option><option value="raid">Main Raid team</option><option value="campaign">Campaign targets</option><option value="war">Active War teams</option><option value="all">All owned characters</option></select></label>
   <label>Plan<select value={horizon} onChange={event=>setHorizon(event.target.value as "next"|"goal")}><option value="next">Next orb upgrade</option><option value="goal">Through planned rarity</option></select></label>
   <label><input type="checkbox" checked={includeMythic} onChange={event=>setIncludeMythic(event.target.checked)}/> Include Mythic upgrades</label>
  </div>
  {!inventory?<p className="sub">Orb inventory unavailable. Sync Account to calculate owned amounts, reservations and shortages.</p>:null}
  <h2>Collect by alliance and rarity</h2>
  <div className="tableWrap"><table><thead><tr><th>Orbs</th><th>Owned</th><th>Needed</th><th>Short</th><th>For whom / where</th></tr></thead><tbody>{plan.pools.map(pool=><tr key={`${pool.alliance}:${pool.rarity}`}><td><strong>{pool.alliance} · {pool.rarity}</strong></td><td>{pool.owned??"Unknown"}</td><td>{pool.needed}</td><td><strong>{pool.shortfall??"Unknown"}</strong></td><td>{pool.recipients.join(", ")}{acquisition(pool)}</td></tr>)}</tbody></table></div>
  <h2>Upgrade order · {plan.rows.length} characters</h2>
  {plan.rows.length?<div className="tableWrap"><table><thead><tr><th>Priority / character</th><th>Upgrade</th><th>Orbs / reservation</th><th>Shards and next action</th></tr></thead><tbody>{plan.rows.map((row,index)=>{
   const step=progressionStep(row.progressionIndex)!;
   const shortages=row.allocations.filter(cost=>cost.shortfall!==0);
   return <tr key={row.id}><td><Link href={`/characters/${row.id}`}><CharacterName id={row.id} name={row.name}/></Link><small>#{index+1} · {row.reasons.join(" · ")}</small><ReferenceDetails label="Usefulness evidence"><p>{row.utility.signals.join(" · ")}</p><p>Account planning relevance, not a measured damage ranking.</p></ReferenceDetails></td>
    <td>{progressionLabel(row.progressionIndex)} → <strong>{progressionLabel(row.end)}</strong><small>Planning goal: {progressionLabel(row.goalIndex)}</small>{row.next.promotions>0?<small>{row.next.promotions} shard-only promotion(s) before the next orb spend.</small>:null}</td>
    <td>{row.allocations.map(cost=><small key={cost.rarity}><strong>{cost.needed} {row.alliance} {cost.rarity}</strong> · {cost.reserved??"?"} reserved · {cost.shortfall??"?"} short</small>)}</td>
    <td>{row.shardsNeeded>0?<small>{row.shardsNeeded} regular shards total · {row.shards??"?"} owned · {row.shardShortfall??"?"} short</small>:null}{row.mythicShardsNeeded>0?<small>{row.mythicShardsNeeded} Mythic shards · {row.mythicShards??"?"} owned · {row.mythicShardShortfall??"?"} short</small>:null}
     <strong>{row.next.promotions>0?`Next: promote with ${step.shards} shards.`:shortages.some(cost=>cost.shortfall===null)||row.shardShortfall===null||row.mythicShardShortfall===null?"Sync missing resources.":shortages.length?"Collect missing orbs.":(row.shardShortfall??0)+(row.mythicShardShortfall??0)>0?"Collect missing shards.":"Orbs and shards reserved · check coins, then upgrade."}</strong></td></tr>;
  })}</tbody></table></div>:<p className="sub">No orb upgrades needed in this scope. Try another scope or include Mythic upgrades.</p>}
  {plan.unknown.length?<p className="sub">Progression or alliance needs review: {plan.unknown.join(", ")}. These units are excluded from totals.</p>:null}
  <ReferenceDetails label="Priority rules and sources"><p>Selected Raid core, selected flex, unfinished campaign targets, active War slots, then general usefulness. Within each group, characters at an orb spend come first, followed by community score and account priority. This is an editable planning scope, not a damage forecast. Each shared pool is reserved once in queue order; reserves can include shard-blocked future work.</p><p>Raid members target Legendary as a first floor, then their next star. Mythic is optional. Campaign floors follow recorded rank and ability targets; missing completion is labelled unknown. War Silver targets Rare and Gold targets Epic; War goals exclude reserves and capped members. Bench Core/Strong characters target Legendary and Useful characters target Epic. All-owned scope manually includes the next orb upgrade for everyone.</p><p>War uses this browser’s saved plan, with the War planner’s default distinct teams when none is saved. <Link href="/war-defense">Edit War teams</Link> · <Link href="/guild-raid">Edit main Raid team</Link> · <Link href="/campaigns">Review campaign targets</Link></p><p><a href={sources.progression.url} target="_blank" rel="noreferrer">Progression costs</a> · <a href={sources.progression.indexSource} target="_blank" rel="noreferrer">API star mapping</a> · reviewed {sources.reviewedOn}. Shop catalog checked {shops.reviewedAt.slice(0,10)}. Prices and schedules describe catalog offers; access, current stock, currencies and mission progress require an in-game check. Orb totals exclude ascension coins, shard acquisition and lower-orb conversions.</p>{sources.sources.map(source=><p key={source.name}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>: {source.note}</p>)}<p>{sources.forge.note}</p><p>Reward references: {sources.rewardReferences.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer">{index?" · ":""}{url.split("/").at(-1)?.replaceAll("_"," ")}</a>)}</p></ReferenceDetails>
 </>;
}
