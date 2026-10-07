"use client";
import ResourceName,{ResourceText} from "../components/ResourceName";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import CollapsibleSection from "../components/CollapsibleSection";
import ReferenceDetails from "../components/ReferenceDetails";
import {orbPlan,shardReadyOrbPlan,combinedOrbDemand,orbHonorees,orbsOwned,type OrbCandidate,type OrbInventory,type OrbScope} from "../../src/domain/orbPlanner";
import {progressionLabel,progressionRarity,progressionStep,type CharacterRarity} from "../../src/domain/characterProgression";
import {WAR_PLAN_STORAGE_KEY,warBadgeTargets,type WarBadgeTeam} from "../../src/domain/warBadgeTargets";
import {currencyName,scheduleLabel,isActionableOffer,type ShopCatalog} from "../../src/domain/shops";
import sources from "../../config/orb_sources.json";

export type OrbPlannerProps={candidates:OrbCandidate[];inventory:OrbInventory|null;defenseTeams:WarBadgeTeam[];offenseTeams:WarBadgeTeam[];shops:ShopCatalog};
export default function OrbPlanner({candidates,inventory,defenseTeams,offenseTeams,shops}:OrbPlannerProps){
 const [scope,setScope]=useState<OrbScope>("priorities");
 const [horizon,setHorizon]=useState<"next"|"goal">("next");
 const [includeMythic,setIncludeMythic]=useState(false);
 const [includeStarUpgrades,setIncludeStarUpgrades]=useState(false);
 const [savedPlan,setSavedPlan]=useState<unknown>(null);
 useEffect(()=>{const read=()=>{try{setSavedPlan(JSON.parse(localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedPlan(null);}};read();window.addEventListener("storage",read);window.addEventListener("focus",read);return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read);};},[]);
 const warTargets=useMemo(()=>warBadgeTargets(defenseTeams,offenseTeams,savedPlan,"war-both"),[defenseTeams,offenseTeams,savedPlan]);
 const plan=useMemo(()=>orbPlan(candidates,inventory,warTargets,{scope,horizon,includeMythic,includeStarUpgrades}),[candidates,inventory,warTargets,scope,horizon,includeMythic,includeStarUpgrades]);
 const ready=useMemo(()=>shardReadyOrbPlan(candidates,inventory,warTargets,includeMythic,includeStarUpgrades),[candidates,inventory,warTargets,includeMythic,includeStarUpgrades]);
 const protectedDemand=useMemo(()=>combinedOrbDemand(plan,ready),[plan,ready]);
 const orbOffers=(rarity:string)=>shops.shops.filter(shop=>shop.coverage==="catalog").flatMap(shop=>shop.offers.filter(offer=>offer.itemId===`draft_ascensionOrbs${rarity}`&&isActionableOffer(offer)).map(offer=>({shop,offer})));
 const acquisition=(pool:typeof plan.pools[number])=>{
  const offers=orbOffers(pool.rarity);
  const forge=sources.forge.offers.find(offer=>offer.rarity===pool.rarity);
  const lowerOwned=forge?orbsOwned(inventory,pool.alliance,forge.lower as CharacterRarity):null;
  const lowerNeeded=forge?protectedDemand.get(`${pool.alliance}:${forge.lower}`)??0:0;
  const forgeCount=lowerOwned===null||pool.shortfall===null?null:Math.min(pool.shortfall,Math.floor(Math.max(0,lowerOwned-lowerNeeded)/5));
  const honorees=orbHonorees(candidates,pool.alliance,pool.rarity);
  return <ReferenceDetails label={`Get ${pool.alliance} ${pool.rarity} orbs`}>
   {offers.map(({shop,offer})=><p key={offer.id}><a href={shop.sourceUrl} target="_blank" rel="noreferrer">{shop.name}</a>: <ResourceName id={`draft_ascensionOrbs${pool.rarity}`} name={`${offer.quantity} draft orb${offer.quantity===1?"":"s"}`}/> for <ResourceName id={offer.cost.currency} name={`${offer.cost.amount.toLocaleString()} ${currencyName(offer.cost.currency)}`}/> · {scheduleLabel(offer.schedule)}{offer.maxPurchases!==null?` · catalog limit ${offer.maxPurchases} purchases`:""}.{pool.shortfall!==null&&pool.shortfall>0?` Cover ${pool.shortfall} short with ${Math.ceil(pool.shortfall/offer.quantity)} pack(s): ${(Math.ceil(pool.shortfall/offer.quantity)*offer.cost.amount).toLocaleString()} ${currencyName(offer.cost.currency)}.`:""} {shop.id==="rogue"?"Requires Rogue Trader access (Legendary star or higher).":"Check shop access and stock in-game."} Choose {pool.alliance}. {offer.conditions.lockId?"Offer lock needs in-game verification.":""}</p>)}
   {<p><a href={sources.sources[0]!.url} target="_blank" rel="noreferrer">Onslaught</a>: {honorees.length?`Current orb-producing honorees: ${honorees.join(", ")}.`:`No confirmed ${pool.alliance} ${pool.rarity}-orb honouree at the required stage in this roster.`} Preview sector reward/chance; deploy and honour the chosen unit. <Link href="/onslaught">Your top honor choices</Link></p>}
   {pool.rarity==="Mythic"?<p><a href={sources.sources[2]!.url} target="_blank" rel="noreferrer">Mythic Journey</a>: check each recipient’s mission chain for first Mythic ascension at Legendary star before buying or forging.</p>:null}
   {forge?<p><a href={sources.forge.url} target="_blank" rel="noreferrer">Forge</a>: <ResourceText text={`each ${pool.alliance} ${pool.rarity} orb costs 5 ${pool.alliance} ${forge.lower} orbs, 1 ${pool.rarity} forge badge and ${forge.coins.toLocaleString()} coins.`}/> {forgeCount===null?"Sync inventory to calculate spare lower-rarity orbs.":forgeCount>0?`After reserving this plan, spare lower orbs could make ${forgeCount}: ${forgeCount*5} lower orbs, ${forgeCount} forge badges and ${(forgeCount*forge.coins).toLocaleString()} coins. Check badges and coins before forging.`:"No forgeable shortfall from spare lower orbs after this plan’s reservations."}</p>:<p>Uncommon orbs cannot be forged.</p>}
  </ReferenceDetails>;
 };
 return <>
  <div className="abilityViews"><label><input type="checkbox" checked={includeStarUpgrades} onChange={event=>setIncludeStarUpgrades(event.target.checked)}/> Include star upgrades within a rarity</label><label><input type="checkbox" checked={includeMythic} onChange={event=>setIncludeMythic(event.target.checked)}/> Include Mythic upgrades</label></div>
  {!inventory?<p className="sub">Orb inventory unavailable. Sync Account to calculate owned amounts, allocations and shortages.</p>:null}
  <CollapsibleSection title="Shard-ready orb shopping list" summary={`${ready.rows.length} characters have the shards · ${ready.waitingForShards} still collecting shards`}>
   <div className="raidTeamSummary">{["Imperial","Xenos","Chaos"].map(alliance=>{
    const pools=ready.pools.filter(pool=>pool.alliance===alliance);
    const missing=pools.filter(pool=>pool.shortfall!==0);
    return <div key={alliance}><small>{alliance.toUpperCase()}</small><strong>{pools.length?pools.map((pool,index)=><span key={pool.rarity}>{index?" · ":""}<ResourceName id={`orb:${pool.alliance}:${pool.rarity}`} name={`${pool.needed} ${pool.rarity}`}/></span>):"No orbs needed"}</strong><span>{missing.length?`Still need: ${missing.map(pool=>`${pool.shortfall??"?"} ${pool.rarity}`).join(" · ")}`:"Orb stock covers this queue"}</span></div>;
   })}</div>
   <p className="sub">{includeStarUpgrades?"Next orb upgrades":"Rarity ascensions toward Legendary"} with enough shards. Totals update after sync. Check coins before upgrading.{!includeStarUpgrades?" Extra stars within Legendary or Mythic are optional; use the toggle above to budget them.":""}</p>
   {ready.pools.length?<div className="tableWrap"><table aria-label="Shard-ready orb totals"><thead><tr><th>Orbs</th><th>Owned</th><th>Needed</th><th>Still need</th><th>Watch these stores</th></tr></thead><tbody>{ready.pools.map(pool=><tr key={`${pool.alliance}:${pool.rarity}`}><td><strong><ResourceName id={`orb:${pool.alliance}:${pool.rarity}`} name={`${pool.alliance} · ${pool.rarity}`}/></strong></td><td>{pool.owned??"Unknown"}</td><td>{pool.needed}</td><td><strong>{pool.shortfall??"Unknown"}</strong></td><td>{orbOffers(pool.rarity).map(({shop,offer})=><small key={offer.id}><a href={shop.sourceUrl} target="_blank" rel="noreferrer">{shop.name}</a> · {offer.quantity} for <ResourceName id={offer.cost.currency} name={`${offer.cost.amount.toLocaleString()} ${currencyName(offer.cost.currency)}`}/> · {scheduleLabel(offer.schedule)}</small>)}{!orbOffers(pool.rarity).length?<small>No verified non-premium shop offer</small>:null}<small>Draft: choose {pool.alliance} · check access and current stock.</small>{acquisition(pool)}</td></tr>)}</tbody></table></div>:<p>No shard-ready orb upgrades{includeMythic?"":" below Mythic"}.</p>}
   {ready.rows.length?<div className="tableWrap"><table aria-label="Shard-ready character upgrades"><thead><tr><th>Character</th><th>Next upgrade</th><th>Orbs needed</th><th>Ready / next action</th></tr></thead><tbody>{ready.rows.map(row=>{
    const cost=row.allocations[0]!;
    const status=row.next.promotions>0?`Promote ${row.next.promotions} time${row.next.promotions===1?"":"s"} first`:cost.shortfall===null?"Sync orb inventory":cost.shortfall>0?`Collect ${cost.shortfall} more orbs`:"Ready to upgrade · check coins";
    const ascends=progressionRarity(row.next.from)!==row.next.orbRarity;
    return <tr key={row.id}><td><Link href={`/characters/${row.id}`}><CharacterName id={row.id} name={row.name}/></Link></td><td>{ascends?`Ascend to ${row.next.orbRarity}`:row.end===15?"Legendary star":`${row.next.orbRarity} star upgrade`}</td><td><strong><ResourceName id={`orb:${row.alliance}:${cost.rarity}`} name={`${cost.needed} ${row.alliance} ${cost.rarity}`}/></strong><small>{cost.reserved??"?"} allocated · {cost.shortfall??"?"} short</small></td><td><strong>{status}</strong><small>Shards ready · {row.shardsNeeded||row.mythicShardsNeeded} needed / {(row.mythicShardsNeeded?row.mythicShards:row.shards)??"?"} owned{row.mythicShardsNeeded?" Mythic":""}</small>{row.next.promotions>0?<small>Shards cover every promotion and the orb upgrade.</small>:null}</td></tr>;
   })}</tbody></table></div>:null}
   {ready.unknownShards.length?<p className="sub">Shard inventory unknown: {ready.unknownShards.join(", ")} · excluded from ready totals.</p>:null}
  </CollapsibleSection>
  <CollapsibleSection title="Longer-term orb plan" summary={`${plan.rows.length} planned characters · includes shard-blocked goals`} defaultOpen={false}>
  <div className="abilityViews">
   <label>Include<select value={scope} onChange={event=>setScope(event.target.value as OrbScope)}><option value="priorities">Account priorities</option><option value="raid">Main Raid team</option><option value="campaign">Campaign targets</option><option value="war">Active War teams</option><option value="all">All owned characters</option></select></label>
   <label>Plan<select value={horizon} onChange={event=>setHorizon(event.target.value as "next"|"goal")}><option value="next">Next orb upgrade</option><option value="goal">Through planned rarity</option></select></label>
  </div>
  <h2>Collect by alliance and rarity</h2>
  <div className="tableWrap"><table><thead><tr><th>Orbs</th><th>Owned</th><th>Needed</th><th>Short</th><th>For whom / where</th></tr></thead><tbody>{plan.pools.map(pool=><tr key={`${pool.alliance}:${pool.rarity}`}><td><strong><ResourceName id={`orb:${pool.alliance}:${pool.rarity}`} name={`${pool.alliance} · ${pool.rarity}`}/></strong></td><td>{pool.owned??"Unknown"}</td><td>{pool.needed}</td><td><strong>{pool.shortfall??"Unknown"}</strong></td><td>{pool.recipients.join(", ")}{acquisition(pool)}</td></tr>)}</tbody></table></div>
  <h2>Upgrade order · {plan.rows.length} characters</h2>
  {plan.rows.length?<div className="tableWrap"><table><thead><tr><th>Priority / character</th><th>Upgrade</th><th>Orbs / reservation</th><th>Shards and next action</th></tr></thead><tbody>{plan.rows.map((row,index)=>{
   const step=progressionStep(row.progressionIndex)!;
   const shortages=row.allocations.filter(cost=>cost.shortfall!==0);
   return <tr key={row.id}><td><Link href={`/characters/${row.id}`}><CharacterName id={row.id} name={row.name}/></Link><small>#{index+1} · {row.reasons.join(" · ")}</small><ReferenceDetails label="Usefulness evidence"><p>{row.utility.signals.join(" · ")}</p><p>Account planning relevance, not a measured damage ranking.</p></ReferenceDetails></td>
    <td>{progressionLabel(row.progressionIndex)} → <strong>{progressionLabel(row.end)}</strong><small>Planning goal: {progressionLabel(row.goalIndex)}</small>{row.next.promotions>0?<small>{row.next.promotions} shard-only promotion(s) before the next orb spend.</small>:null}</td>
    <td>{row.allocations.map(cost=><small key={cost.rarity}><strong><ResourceName id={`orb:${row.alliance}:${cost.rarity}`} name={`${cost.needed} ${row.alliance} ${cost.rarity}`}/></strong> · {cost.reserved??"?"} reserved · {cost.shortfall??"?"} short</small>)}</td>
    <td>{row.shardsNeeded>0?<small><ResourceName id="shards" name={`${row.shardsNeeded} regular shards`}/> total · {row.shards??"?"} owned · {row.shardShortfall??"?"} short</small>:null}{row.mythicShardsNeeded>0?<small><ResourceName id="mythicShards" name={`${row.mythicShardsNeeded} Mythic shards`}/> · {row.mythicShards??"?"} owned · {row.mythicShardShortfall??"?"} short</small>:null}
     <strong>{row.next.promotions>0?`Next: promote with ${step.shards} shards.`:shortages.some(cost=>cost.shortfall===null)||row.shardShortfall===null||row.mythicShardShortfall===null?"Sync missing resources.":shortages.length?"Collect missing orbs.":(row.shardShortfall??0)+(row.mythicShardShortfall??0)>0?"Collect missing shards.":"Orbs and shards reserved · check coins, then upgrade."}</strong></td></tr>;
  })}</tbody></table></div>:<p className="sub">No orb upgrades needed in this scope. Try another scope or include Mythic upgrades.</p>}
  {plan.unknown.length?<p className="sub">Progression or alliance needs review: {plan.unknown.join(", ")}. These units are excluded from totals.</p>:null}
  </CollapsibleSection>
  <ReferenceDetails label="Priority rules and sources"><p>Selected Raid core, selected flex, unfinished campaign targets, active War slots, then general usefulness. Within each group, characters at an orb spend come first, followed by community score and account priority. This is an editable planning scope, not a damage forecast. Each shared pool is reserved once in queue order; reserves can include shard-blocked future work.</p><p>Raid members target Legendary as a first floor. Extra stars within Legendary/Mythic are excluded unless enabled; Mythic ascension is separately optional. Campaign floors follow recorded rank and ability targets; missing completion is labelled unknown. War Silver targets Rare and Gold targets Epic; War goals exclude reserves and capped members. Bench Core/Strong characters target Legendary and Useful characters target Epic. All-owned scope includes each character’s next rarity ascension, with extra star spends available through the toggle.</p><p>War uses this browser’s saved plan, with the War planner’s default distinct teams when none is saved. <Link href="/war-defense">Edit War teams</Link> · <Link href="/guild-raid">Edit main Raid team</Link> · <Link href="/campaigns">Review campaign targets</Link></p><p><a href={sources.progression.url} target="_blank" rel="noreferrer">Progression costs</a> · <a href={sources.progression.indexSource} target="_blank" rel="noreferrer">API star mapping</a> · reviewed {sources.reviewedOn}. Shop catalog checked {shops.reviewedAt.slice(0,10)}. Prices and schedules describe catalog offers; access, current stock, currencies and mission progress require an in-game check. Orb totals exclude ascension coins, shard acquisition and lower-orb conversions. The shard-ready queue covers each character’s next orb spend; the longer-term plan is a separate projection. Do not add their totals together. Forge suggestions protect both queues, counting each character’s overlapping demand once.</p>{sources.sources.map(source=><p key={source.name}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>: {source.note}</p>)}<p>{sources.forge.note}</p><p>Reward references: {sources.rewardReferences.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer">{index?" · ":""}{url.split("/").at(-1)?.replaceAll("_"," ")}</a>)}</p></ReferenceDetails>
 </>;
}
