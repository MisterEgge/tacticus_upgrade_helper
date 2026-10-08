import ProgressionBadge from "../../components/ProgressionBadge";
import ResourceName from "../../components/ResourceName";
import Link from "next/link";
import Nav from "../../components/Nav";
import CharacterName from "../../components/CharacterName";
import CollapsibleSection from "../../components/CollapsibleSection";
import ReferenceDetails from "../../components/ReferenceDetails";
import CharacterAbilities from "./CharacterAbilities";
import CharacterEquipment from "./CharacterEquipment";
import CharacterProgression from "./CharacterProgression";
import {buildEquipmentPlan} from "../../lib/equipmentPlan";
import {getShopCatalog} from "../../lib/shops";
import {getReport} from "../../lib/report";
import {getCatalogCharacter,getCharacterCatalog,getAbilityBreakpoints,getAbilityEvidence,type CharacterAbilityGuidance} from "../../lib/catalog";
import {abilityGuideRows} from "../../../src/domain/abilities";
import {rankName} from "../../../src/domain/ranks";

export default async function CharacterDetail({params}:{params:Promise<{id:string}>}) {
 const {id}=await params,report=await getReport();
 const unit=report?.roster.find(row=>row.id===decodeURIComponent(id));
 if(!report||!unit)return <main><Nav/><div className="empty"><h2>Character not found</h2></div></main>;
 const [meta,breakpoints,shops,catalog]=await Promise.all([getCatalogCharacter(unit.id),getAbilityBreakpoints(),getShopCatalog(),getCharacterCatalog()]);
 const guide=abilityGuideRows(catalog.characters,report.roster,breakpoints,{}).find(row=>row.id===unit.id);
 const canonicalName=guide?.character??meta?.name??unit.name;
 const guidance=breakpoints[canonicalName] as CharacterAbilityGuidance|undefined;
 const evidence=await getAbilityEvidence(canonicalName);
 const slots=buildEquipmentPlan(report,catalog,shops).rows.find(row=>row.characterId===unit.id)?.slots??[];
 const snapshot=report.abilityQueue.find(row=>row.character===unit.name);
 return <main><Nav/><Link className="viewLink" href="/characters">← Characters</Link>
  <header className="detailHeader"><div><p className="eyebrow">{unit.faction}</p><h1><CharacterName name={unit.name} id={unit.id} icon={unit.icon}/></h1><p className="sub"><ProgressionBadge index={unit.progressionIndex}/> · {rankName(unit.rank)} · level {unit.xpLevel}</p></div></header>
  {meta?<><CharacterProgression unit={unit} inventory={report.orbInventory}/><CharacterAbilities unit={unit} guide={guide} guidance={guidance} evidence={evidence} badgeInventory={report.abilityBadges}/><CharacterEquipment unit={unit} slots={slots} shops={shops} powerLevel={report.source.powerLevel??null}/></>:<CollapsibleSection title="Ability upgrades" summary="Character planning unavailable · unit type needs verification" className="panel detailPanel"><p className="sub">This unit is outside the verified character catalog. Character badge costs and provisional targets are not applied to Machines of War or unverified units.</p></CollapsibleSection>}
  <ReferenceDetails label="Character reference"><p><ResourceName id="shards" name={`${unit.shards??"Unknown"} regular shards`}/> · <ResourceName id="mythicShards" name={`${unit.mythicShards??"Unknown"} Mythic shards`}/></p>{meta?.traits?.length?<p>Traits: {meta.traits.join(" · ")}</p>:null}{unit.power!==undefined?<p>Latest observed Guild Raid loadout power: {unit.power.toLocaleString()}</p>:null}{snapshot?<details><summary>Ability guidance at last report generation</summary><p>{snapshot.focus} · {snapshot.basis}</p><p>Active: {snapshot.communityActiveTarget} · Passive: {snapshot.communityPassiveTarget}</p><small>Snapshot reference. Current targets and next actions appear above.</small></details>:null}</ReferenceDetails>
 </main>;
}
