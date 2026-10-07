import {buildEquipmentPlan} from "../../lib/equipmentPlan";
import CollapsibleSection from "../../components/CollapsibleSection";
import EquipmentSources from "../../components/EquipmentSources";
import {getShopCatalog} from "../../lib/shops";
import CharacterAbilities from "./CharacterAbilities";
import ReferenceDetails from "../../components/ReferenceDetails";
import {abilityGuideRows} from "../../../src/domain/abilities";
import Link from "next/link";import Nav from "../../components/Nav";import CharacterName from "../../components/CharacterName";import{getReport}from"../../lib/report";import{getCatalogCharacter,getCharacterCatalog,getAbilityBreakpoints,getAbilityEvidence,type CharacterAbilityGuidance}from"../../lib/catalog";import{rankName}from"../../../src/domain/ranks";
export default async function CharacterDetail({params}:{params:Promise<{id:string}>}){const{id}=await params;const r=await getReport();const u=r?.roster.find(x=>x.id===decodeURIComponent(id));if(!r||!u)return <main><Nav/><div className="empty"><h2>Character not found</h2></div></main>;
const [meta,breakpoints,shops,catalog]=await Promise.all([getCatalogCharacter(u.id),getAbilityBreakpoints(),getShopCatalog(),getCharacterCatalog()]);
const guide=abilityGuideRows(catalog.characters,r.roster,breakpoints,{}).find(row=>row.id===u.id);
const canonicalName=guide?.character??meta?.name??u.name;
const guidance=breakpoints[canonicalName] as CharacterAbilityGuidance|undefined;
const evidence=await getAbilityEvidence(canonicalName);
const equipmentRow=buildEquipmentPlan(r,catalog,shops).rows.find(row=>row.characterId===u.id);
const options=equipmentRow?.slots.filter(slot=>slot.state!=="UNKNOWN"&&slot.state!=="LEVEL UP")??[];
const aq=r.abilityQueue.find(x=>x.character===u.name);
return <main><Nav/><Link className="viewLink" href="/characters">← Characters</Link><header className="detailHeader"><div><p className="eyebrow">{u.faction}</p><h1><CharacterName name={u.name} id={u.id} icon={u.icon}/></h1><p className="sub">{u.rarity} · {rankName(u.rank)} · XP level {u.xpLevel} · {u.shards} shards</p>{meta?.traits?.length?<p className="traitLine">{meta.traits.join(" · ")}</p>:null}</div></header>
<section className="cards compact"><div className="card"><strong>{u.abilities[0]?.level??"—"}</strong><span>Active level</span></div><div className="card"><strong>{u.abilities[1]?.level??"—"}</strong><span>Passive level</span></div><div className="card"><strong>{new Set(options.map(option=>option.slotId)).size}</strong><span>Gear targets</span><small>Slots with upgrade alternatives</small></div></section>
{meta?<CharacterAbilities unit={u} guide={guide} guidance={guidance} evidence={evidence} badgeInventory={r.abilityBadges}/>:<CollapsibleSection title="Ability upgrades" summary="Character planning unavailable · unit type needs verification" className="panel detailPanel"><p className="sub">This unit is outside the verified character catalog. Character badge costs and provisional targets are not applied to Machines of War or unverified units.</p></CollapsibleSection>}
{aq?<ReferenceDetails label="Ability guidance at last report generation"><p>{aq.focus} · {aq.basis}</p><p>Active: {aq.communityActiveTarget} · Passive: {aq.communityPassiveTarget}</p><small>Snapshot reference. Current targets and next actions appear above.</small></ReferenceDetails>:null}
<CollapsibleSection title="Equipment" summary={options.some(option=>option.state==="EQUIP NOW")?"Upgrade now · inventory replacement reserved":options.some(option=>option.state==="LEVEL INVENTORY")?"Level up inventory gear before equipping":options.some(option=>option.acquisition.some(source=>source.offers.length))?"Buy an upgrade · shop details below · check stock":"Review equipped gear and available upgrade targets"} className="panel detailPanel characterEquipment">
<div className="tableWrap"><table><thead><tr><th>Current equipment</th><th>Upgrade to</th><th>Next action</th></tr></thead><tbody>{u.items.map(item=>{
 const choices=options.filter(option=>option.slotId===item.slotId);
 return <tr key={item.slotId}><td><strong>{item.name??item.id}</strong><small>{item.rarity??"Unknown"} · level {item.level}</small></td><td>{choices.length?choices.map(choice=><div className="equipmentSlotAction" key={choice.acquisition[0]?.id??choice.target}><strong>{choice.target}</strong><small>{choice.itemRarity}{choice.minimumLevel>1?` · needs level ${choice.minimumLevel} before equipping`:""}</small><small>{choice.reason}</small></div>):"No verified replacement target"}</td><td>{choices.length?choices.map(choice=><div className="equipmentSlotAction" key={choice.acquisition[0]?.id??choice.target}>
{choice.state==="EQUIP NOW"?<><strong className="ready">Upgrade now · equip {choice.acquisition.find(source=>source.id===choice.allocatedItemId)?.name??choice.target} from inventory</strong><small>One copy reserved for {u.name} · level {choice.allocatedLevel??1}</small></>:<>{choice.state==="LEVEL INVENTORY"?<><strong>Level up inventory gear before equipping</strong><small>Replacement needs level {choice.minimumLevel} · check coins and salvage</small></>:<>{choice.freeCopies>0?<><strong className="ready">Inventory alternative · {choice.freeCopies} unreserved copies</strong><small>Shared choices · no copy assigned to this option</small></>:null}{choice.state==="UNKNOWN"?<small>Replacement refinement needs review</small>:choice.acquisition.some(source=>source.offers.length)?<strong>Buy an upgrade here · {choice.acquisition.flatMap(source=>source.offers.map(offer=>offer.shop)).filter((shop,index,all)=>all.indexOf(shop)===index).join(" / ")}</strong>:<small>No eligible shop offer recorded</small>}</>}</>}
<EquipmentSources target={{preferredLegendaryItemIds:choice.acquisition.map(source=>source.id)}} catalog={shops} powerLevel={r.source.powerLevel??null}/>
</div>):<small>No verified replacement · current gear may already meet the target, or compatibility needs review.</small>}</td></tr>;
})}</tbody></table></div>
{!u.items.length?<p className="sub">No equipped gear recorded at the last sync.</p>:null}
</CollapsibleSection></main>}
