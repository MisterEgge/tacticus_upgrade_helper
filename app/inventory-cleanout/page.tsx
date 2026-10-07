import ReferenceDetails from "../components/ReferenceDetails";
import CollapsibleSection from "../components/CollapsibleSection";
import CharacterName from "../components/CharacterName";
import Link from "next/link";
import Nav from "../components/Nav";
import {getReport} from "../lib/report";
import {getCharacterCatalog} from "../lib/catalog";
import {getShopCatalog,getEquipmentCharacters} from "../lib/shops";
import {buildEquipmentPlan} from "../lib/equipmentPlan";
import {inventoryCleanout} from "../../src/domain/inventoryCleanout";
import CleanoutTable from "./CleanoutTable";

export default async function InventoryCleanout({searchParams}:{searchParams:Promise<{scope?:string}>}) {
 const [report,catalog,shops,pool,params]=await Promise.all([getReport(),getCharacterCatalog(),getShopCatalog(),getEquipmentCharacters(),searchParams]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const reserveLocked=params.scope!=="owned";
 const ready=buildEquipmentPlan(report,catalog,shops).tieredSlots.filter(slot=>slot.state==="EQUIP NOW");
 const sourceMatches=pool&&shops&&pool.sourceCommit===shops.sourceCommit;
 const recipients=sourceMatches?[...pool.characters]:[];
 // The live equipped slots prove equipment types for newly released owned characters.
 for(const unit of report.roster)if(!recipients.some(character=>character.id===unit.id)&&unit.items.length){
  const types=unit.items.map(item=>shops?.equipment[item.id]?.type).filter((type):type is string=>Boolean(type));
  if(types.length===unit.items.length)recipients.push({id:unit.id,name:unit.name,faction:unit.faction,equipment:types,traits:[]});
 }
 const rows=inventoryCleanout(report.unequippedInventory,report.roster,ready,recipients,sourceMatches?shops.equipment:{},{reserveLocked});
 return <main><Nav/><header><div><p className="eyebrow">INVENTORY</p><h1>Inventory Cleanout</h1><p className="sub">Keep useful equipment, protect planned upgrades, and identify excess level-1 copies.</p></div><div className="power">{rows.reduce((sum,row)=>sum+row.scrap,0)}<strong> salvage candidates</strong></div></header>
  <form className="panel goalForm" action="/inventory-cleanout"><label>Reserve scope<select name="scope" defaultValue={reserveLocked?"all":"owned"}><option value="all">Owned + locked characters</option><option value="owned">Owned roster only</option></select></label><button type="submit">Update reserves</button><small>{reserveLocked?"Locked characters receive their own future reserves.":"Surplus is scoped to your owned roster; future unlock needs are shown separately."}</small></form>
  <CollapsibleSection title="Equip before cleaning out" summary={`${ready.length} reserved replacements`} defaultOpen={ready.length>0}>
   {ready.length?<div className="tableWrap"><table><thead><tr><th>Character</th><th>Equip from inventory</th><th>Copy level</th></tr></thead><tbody>{ready.map(slot=><tr key={`${slot.character}:${slot.slotId}`}><td><CharacterName name={slot.character} id={slot.characterId}/></td><td><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(slot.allocatedItemId!)}`}>{slot.target}</Link></td><td>{slot.allocatedLevel??1}</td></tr>)}</tbody></table></div>:<p className="sub">No immediate replacement allocations. Useful and future copies are still protected below.</p>}
  </CollapsibleSection>
  <CleanoutTable rows={rows} reserveLocked={reserveLocked}/>
  <p className="sub"><Link className="sourceLink" href="/material-completion">Review lifetime upgrade-material demand</Link> for crafting materials. This page audits equipment only.</p>
  <ReferenceDetails label="Salvage safety checks"><p>Exact item restrictions and character equipment slots come from the same equipment source snapshot, supplemented by verified owned equipment slots. Each reserve names its recipients. Missing definitions, compatibility, progression or level stats remain unresolved.</p><p>Duplicate stacks are combined only at the same item level. Planned copy levels are protected first, then the best remaining copies. Other leveled copies are retained for manual review. Lower-chance block items remain situational alternatives; none are automatically marked salvage-safe.</p><p>“Salvage candidates” means level-1 copies above this selected reserve policy. It is not permanent game-wide completion, and the page does not sell or salvage anything.</p><small>Source snapshot: {shops?.sourceCommit??"unavailable"} · {sourceMatches?`${pool.characters.length} source characters plus verified owned slots`:"source mismatch or missing character data — salvage disabled"}</small></ReferenceDetails>
 </main>;
}
