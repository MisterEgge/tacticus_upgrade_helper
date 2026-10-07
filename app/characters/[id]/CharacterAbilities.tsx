import Link from "next/link";
import CollapsibleSection from "../../components/CollapsibleSection";
import ReferenceDetails from "../../components/ReferenceDetails";
import {formatAbilityName,type AbilityGuideRow} from "../../../src/domain/abilities";
import {abilityReadiness,type AbilityReadiness} from "../../../src/domain/abilityReadiness";
import {totalBadgeCosts} from "../../../src/domain/abilityCosts";
import {badgeShortfalls,type AbilityBadgeInventory} from "../../../src/domain/badgeInventory";
import type {RosterUnit} from "../../lib/report";
import type {AbilityEvidence,CharacterAbilityGuidance} from "../../lib/catalog";

function NextAction({plan}:{plan:AbilityReadiness}) {
 if(plan.state==="TARGET MET")return <strong>Practical target met · no further upgrade required</strong>;
 if(plan.state==="UNKNOWN"||plan.state==="GATED")return <strong>{plan.gates.join(" · ")}</strong>;
 if(plan.state==="BADGES NEEDED")return <><strong>Collect badges for level {plan.nextLevel}</strong>{plan.badges.filter(badge=>(badge.shortfall??0)>0).map(badge=><small key={badge.rarity}>{badge.shortfall} {badge.rarity} short · {badge.owned} owned / {badge.needed} needed</small>)}</>;
 if(plan.state==="CHECK BADGES")return <><strong>XP and rarity allow level {plan.nextLevel} · sync badges</strong><small>Badge balance unknown · check coins</small></>;
 return <><strong className="ready">Next level {plan.nextLevel} eligible · badges covered</strong><small>Check coins before upgrading</small></>;
}

export default function CharacterAbilities({unit,guide,guidance,evidence,badgeInventory}:{unit:RosterUnit;guide:AbilityGuideRow|undefined;guidance:CharacterAbilityGuidance|undefined;evidence:AbilityEvidence[];badgeInventory:AbilityBadgeInventory|null|undefined}) {
 const rows=(["Active","Passive"] as const).map((label,index)=>{
  const current=unit.abilities[index]?.level??null;
  const target=(index===0?guide?.activeTargetLevel:guide?.passiveTargetLevel)??17;
  const ability=index===0?guidance?.active:guidance?.passive;
  return {label,current,target,name:formatAbilityName((index===0?guide?.activeId:guide?.passiveId)??unit.abilities[index]?.id??"Unknown ability"),practical:(index===0?guide?.communityActiveTarget:guide?.communityPassiveTarget)??"17 provisional baseline",high:(index===0?guide?.activeHigh:guide?.passiveHigh)??"Not researched",note:guide?.recommended?ability?.note:"Level 17 is a provisional planning floor. Confirm this ability is useful for your selected team before spending.",modes:guide?.recommended?ability?.modes??[]:[],plan:abilityReadiness({level:current,target,xpLevel:unit.xpLevel,rarity:unit.rarity,alliance:unit.grandAlliance},badgeInventory)};
 });
 const planned=totalBadgeCosts(rows.map(row=>row.plan.planned));
 const eligible=totalBadgeCosts(rows.map(row=>row.plan.eligible));
 const validAlliance=["Imperial","Imperium","Chaos","Xenos"].includes(unit.grandAlliance);
 const badges=badgeShortfalls(validAlliance?badgeInventory:null,unit.grandAlliance==="Imperium"?"Imperial":unit.grandAlliance,planned,eligible);
 const knownCosts=rows.every(row=>row.plan.state!=="UNKNOWN");
 const basis=guide?.reviewed?`Community guidance · ${guide.targetConfidence} confidence`:guide?.recommended?"Planning recommendation · community validation pending":"Provisional baseline · character research pending";
 const summary=rows.map(row=>`${row.label}: ${row.current??"?"} → ${row.target}${row.plan.state==="TARGET MET"?" · met":row.plan.state==="GATED"?" · progression needed":row.plan.state==="BADGES NEEDED"?" · badges needed":row.plan.state==="UNKNOWN"?" · review":row.plan.state==="CHECK BADGES"?" · sync badges":" · next level eligible"}`).join(" | ");
 return <CollapsibleSection title="Ability upgrades" summary={summary} className="panel detailPanel">
  <p className="sub">{basis}</p>
  <div className="tableWrap"><table><thead><tr><th>Ability</th><th>Practical target</th><th>Next level cost</th><th>Next action</th></tr></thead><tbody>{rows.map(row=><tr key={row.label}>
   <td><strong>{row.label} · level {row.current??"unknown"}</strong><small>{row.name}</small></td>
   <td><strong>{row.practical}</strong>{row.high!=="Not researched"&&row.high!==String(row.target)?<small>High investment option: {row.high}</small>:null}{row.plan.reachable!==null&&row.plan.state!=="TARGET MET"&&row.plan.reachable>=(row.current??0)?<small>XP / rarity allow up to {row.plan.reachable}</small>:null}</td>
   <td>{row.plan.state==="TARGET MET"?"—":Object.entries(row.plan.nextCost).length?Object.entries(row.plan.nextCost).map(([rarity,amount])=><small key={rarity}>{amount} {unit.grandAlliance} {rarity} badge{amount===1?"":"s"}</small>):"Unknown"}</td>
   <td><NextAction plan={row.plan}/><ReferenceDetails label={`${row.label} target rationale`}><p>{row.note}</p>{row.modes.length?<small>{row.modes.join(" · ")}</small>:null}</ReferenceDetails></td>
  </tr>)}</tbody></table></div>
  <p className="sub">Next-level checks share the same badge stock. Choose a step and check coins before spending.</p>
  <CollapsibleSection title="Badges to practical targets" summary={knownCosts?Object.entries(planned).map(([rarity,amount])=>`${amount} ${rarity}`).join(" · ")||"Targets met":"Incomplete ability data · costs need review"} defaultOpen={false}>
   {badges.length?<div className="tableWrap"><table><thead><tr><th>{unit.grandAlliance} badge</th><th>Owned</th><th>Needed for both targets</th><th>Shortfall</th></tr></thead><tbody>{badges.map(badge=><tr key={badge.rarity}><td>{badge.rarity}</td><td>{badge.owned??"Unknown"}</td><td>{badge.needed}</td><td>{badge.shortfall??"Unknown"}</td></tr>)}</tbody></table></div>:<p className="sub">{knownCosts?"No remaining badge demand at the practical stops.":"Sync ability data before calculating complete costs."}</p>}
   {!knownCosts&&badges.length?<p className="sub">Partial costs only; unresolved ability demand is excluded.</p>:null}
   <p className="sub">Combined demand counts both practical targets once. Badges are not reserved here.</p>
  </CollapsibleSection>
  <ReferenceDetails label="Target evidence and limits"><p>Targets use the same practical first stop as Badge Budget. Higher investment is an optional future choice. Progression eligibility is separate from affordability; character rank does not gate ability levels.</p>{evidence.length&&guide?.reviewed?<ul>{evidence.map((source,index)=><li key={`${source.url}:${index}`}><a className="sourceLink" href={source.url} target="_blank" rel="noreferrer">Community evidence{source.date?` · ${source.date}`:""}</a><small>{source.supports?.join(" · ")}</small></li>)}</ul>:<p>Character-specific source records are still pending.</p>}<Link className="sourceLink" href="/review-status">Review target coverage</Link> · <Link className="sourceLink" href="/abilities">Open shared badge budget</Link></ReferenceDetails>
 </CollapsibleSection>;
}
