import Nav from "../components/Nav";
import ReferenceDetails from "../components/ReferenceDetails";
import {getReport} from "../lib/report";
import {getShopCatalog} from "../lib/shops";
import {getCharacterCatalog,getAbilityBreakpoints} from "../lib/catalog";
import {buildEquipmentPlan} from "../lib/equipmentPlan";
import {characterRosterRow} from "../lib/characterUpgradeSummary";
import {abilityGuideRows} from "../../src/domain/abilities";
import CharacterTable from "./CharacterTable";

export default async function Characters() {
 const report=await getReport();
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const [shops,catalog,breakpoints]=await Promise.all([getShopCatalog(),getCharacterCatalog(),getAbilityBreakpoints()]);
 const equipment=buildEquipmentPlan(report,catalog,shops);
 const guides=new Map(abilityGuideRows(catalog.characters,report.roster,breakpoints,{}).map(row=>[row.id,row]));
 const ids=new Set(catalog.characters.map(character=>character.id));
 const rows=report.roster.map(unit=>characterRosterRow(unit,guides.get(unit.id),equipment.rows.find(row=>row.characterId===unit.id)?.slots??[],report.abilityBadges,report.orbInventory,ids.has(unit.id)));
 return <main><Nav/><header><div><p className="eyebrow">ROSTER</p><h1>Characters</h1><p className="sub">Next gear, ability and rarity upgrades. Filter by the resource you need.</p></div><div className="power">{rows.length}<strong> owned units</strong></div></header>
  <section className="panel tablePanel characterRoster"><CharacterTable rows={rows}/></section>
  <ReferenceDetails label="Roster checks and raid power"><p>Resources ready means exported shards, badges or an allocated gear copy cover that step; check coins before spending. Ability targets match character pages. Badge and orb balances are shared checks, not reservations across this list. Extra stars within Legendary/Mythic are optional in the Orb planner.</p><p>Latest observed Guild Raid loadout power is reference data, not a live roster ranking.</p><div className="tableWrap"><table><thead><tr><th>Character</th><th>Raid power</th></tr></thead><tbody>{report.roster.filter(unit=>unit.power!==undefined).map(unit=><tr key={unit.id}><td>{unit.name}</td><td>{unit.power?.toLocaleString()}</td></tr>)}</tbody></table></div></ReferenceDetails>
 </main>;
}
