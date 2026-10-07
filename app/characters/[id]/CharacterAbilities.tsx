import ResourceName,{ResourceText} from "../../components/ResourceName";
import Link from "next/link";
import CollapsibleSection from "../../components/CollapsibleSection";
import ReferenceDetails from "../../components/ReferenceDetails";
import {formatAbilityName,type AbilityGuideRow} from "../../../src/domain/abilities";
import {abilityReadiness,type AbilityReadiness} from "../../../src/domain/abilityReadiness";
import {totalBadgeCosts} from "../../../src/domain/abilityCosts";
import {badgeShortfalls,type AbilityBadgeInventory} from "../../../src/domain/badgeInventory";
import type {RosterUnit} from "../../lib/report";
import type {AbilityEvidence,CharacterAbilityGuidance} from "../../lib/catalog";

function NextAction({plan,alliance}:{plan:AbilityReadiness;alliance:string}) {
 if(plan.state==="TARGET MET")return <strong>Practical target met · no further upgrade required</strong>;
 if(plan.state==="UNKNOWN"||plan.state==="GATED")return <strong>{plan.gates.join(" · ")}</strong>;
 if(plan.state==="BADGES NEEDED")return <><strong>Collect badges for level {plan.nextLevel}</strong>{plan.badges.filter(badge=>(badge.shortfall??0)>0).map(badge=><small key={badge.rarity}><ResourceName id={`badge:${alliance==="Imperium"?"Imperial":alliance}:${badge.rarity}`} name={`${badge.shortfall} ${badge.rarity} short`}/> · {badge.owned} owned / {badge.needed} needed</small>)}</>;
 if(plan.state==="CHECK BADGES")return <><strong>XP and rarity allow level {plan.nextLevel} · sync badges</strong><small>Badge balance unknown · check coins</small></>;
 return <><strong className="ready">Next level {plan.nextLevel} eligible · badges covered</strong><small><ResourceText text="Check coins before upgrading"/></small></>;
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
 const remaining=rows.filter(row=>row.plan.state!=="TARGET MET").length;
 const summary=remaining?`${remaining} practical target${remaining===1?"":"s"} need work` : "Both practical targets met";
 return <div id="abilities"><CollapsibleSection title="Ability upgrades" summary={summary} className="panel detailPanel compactCharacterTable">
  <p className="sub">{basis}</p>
  <div className="tableWrap"><table aria-label="Character ability upgrades"><thead><tr><th>Ability</th><th>First stop</th><th>Next action / cost</th></tr></thead><tbody>{rows.map(row=><tr key={row.label}>
   <td><strong>{row.label} · level {row.current??"unknown"}</strong><small>{row.name}</small></td>
   <td><strong>{row.target}</strong><ReferenceDetails label={`${row.label} target details`}><p>Practical range: {row.practical}</p>{row.high!=="Not researched"&&row.high!==String(row.target)?<p>High investment option: {row.high}</p>:null}<p>{row.note}</p>{row.modes.length?<small>{row.modes.join(" · ")}</small>:null}</ReferenceDetails></td>
   <td><NextAction plan={row.plan} alliance={unit.grandAlliance}/>{row.plan.state!=="TARGET MET"&&Object.entries(row.plan.nextCost).length?Object.entries(row.plan.nextCost).map(([rarity,amount])=><small key={rarity}>Level {row.plan.nextLevel}: <ResourceName id={`badge:${unit.grandAlliance==="Imperium"?"Imperial":unit.grandAlliance}:${rarity}`} name={`${amount} ${unit.grandAlliance} ${rarity} badge${amount===1?"":"s"}`}/></small>):null}</td>
  </tr>)}</tbody></table></div>
  <small className="characterBudgetNote">Both abilities use shared badge stock; choose one step before spending.</small>
  <CollapsibleSection title="Badges to practical targets" summary={knownCosts?Object.entries(planned).map(([rarity,amount])=>`${amount} ${rarity}`).join(" · ")||"Targets met":"Incomplete ability data · costs need review"} defaultOpen={false}>
   {badges.length?<div className="tableWrap"><table><thead><tr><th>{unit.grandAlliance} badge</th><th>Owned</th><th>Needed for both targets</th><th>Shortfall</th></tr></thead><tbody>{badges.map(badge=><tr key={badge.rarity}><td><ResourceName id={`badge:${unit.grandAlliance==="Imperium"?"Imperial":unit.grandAlliance}:${badge.rarity}`} name={badge.rarity}/></td><td>{badge.owned??"Unknown"}</td><td>{badge.needed}</td><td>{badge.shortfall??"Unknown"}</td></tr>)}</tbody></table></div>:<p className="sub">{knownCosts?"No remaining badge demand at the practical stops.":"Sync ability data before calculating complete costs."}</p>}
   {!knownCosts&&badges.length?<p className="sub">Partial costs only; unresolved ability demand is excluded.</p>:null}
   <p className="sub">Combined demand counts both practical targets once. Badges are not reserved here.</p>
  </CollapsibleSection>
  <ReferenceDetails label="Target evidence and limits"><p>Targets use the same practical first stop as Badge Budget. Higher investment is an optional future choice. Progression eligibility is separate from affordability; character rank does not gate ability levels.</p>{evidence.length&&guide?.reviewed?<ul>{evidence.map((source,index)=><li key={`${source.url}:${index}`}><a className="sourceLink" href={source.url} target="_blank" rel="noreferrer">Community evidence{source.date?` · ${source.date}`:""}</a><small>{source.supports?.join(" · ")}</small></li>)}</ul>:<p>Character-specific source records are still pending.</p>}<Link className="sourceLink" href="/review-status">Review target coverage</Link> · <Link className="sourceLink" href="/abilities">Open shared badge budget</Link></ReferenceDetails>
 </CollapsibleSection></div>;
}
