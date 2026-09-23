import {readFile}from "node:fs/promises";
import Link from "next/link";
import Nav from "../components/Nav";
import {getCharacterCatalog}from "../lib/catalog";
import {getReport}from "../lib/report";
import {legendaryOpportunityAudit,legendaryReallocationAudit}from "../../src/domain/reallocation";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition}from "../../src/domain/campaigns";

type Focus=Record<string,{priority?:number;modes?:string[]}>;
export default async function ReallocationPage()
{
    const[report,catalog,focus,battleText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/character_priorities.json","utf8").then(value=>JSON.parse(value)as Focus),readFile("data/game/campaign-battles.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
    const needs=report.equipmentAllocation.buyWatch.flatMap(row=>{const ids=row.preferredLegendaryItemIds??[];return ids.length===1&&row.characterId?[{character:row.character,characterId:row.characterId,slotId:row.slotId,itemId:ids[0]!,itemName:row.preferredLegendaryItems?.[0]??ids[0]!}]:[]});
    const battles=Object.values(JSON.parse(battleText))as CampaignBattleDefinition[];
    const incomplete=new Set((report.campaignProgress??[]).filter(progress=>!campaignIsComplete(progress,battles)).map(requiredCampaignName));
    const campaignRequired=new Set(catalog.characters.filter(character=>character.campaignsRequiredIn.some(name=>incomplete.has(name))).map(character=>character.name));
    const opportunities=legendaryOpportunityAudit(report.roster,focus,campaignRequired);
    const exactMatches=legendaryReallocationAudit(needs,report.roster,focus,campaignRequired).filter(row=>row.donors.length);
    return <main><Nav/><header><div><p className="eyebrow">LEGENDARY GEAR</p><h1>Reallocation Audit</h1><p className="sub">Keep scarce Legendary gear on campaign and active War/Raid/LRE characters. Release candidates require a verified compatible recipient before moving anything.</p></div><div className="power">{opportunities.length}<strong> release candidates</strong></div></header><section className="panel tablePanel"><h2>Potentially wasted Legendary gear</h2><p className="sub">No active account role and no incomplete-campaign requirement. This includes the Snappawrecka case; it is a review flag, not an automatic move.</p>{!opportunities.length?<div className="empty">No low-use Legendary holdings found.</div>:<div className="tableWrap"><table><thead><tr><th>Holder</th><th>Legendary item</th><th>Why review it</th></tr></thead><tbody>{opportunities.map(item=><tr key={`${item.characterId}:${item.slotId}:${item.itemId}`}><td><Link className="sourceLink" href={`/characters/${item.characterId}`}>{item.character}</Link></td><td>{item.slotId}<small>{item.itemId} · level {item.level}</small></td><td>{item.reason}</td></tr>)}</tbody></table></div>}</section><section className="panel tablePanel"><h2>Exact current-target matches</h2><p className="sub">Existing equipped Legendary copies that exactly match a current one-item target. Protected holders are shown so the reason is visible.</p>{!exactMatches.length?<div className="empty">No exact Legendary duplicates currently match a one-item target.</div>:<div className="tableWrap"><table><thead><tr><th>Build target</th><th>Equipped match</th><th>Why it stays protected</th></tr></thead><tbody>{exactMatches.flatMap(row=>row.donors.map(donor=><tr key={`${row.characterId}:${row.slotId}:${donor.characterId}:${donor.slotId}`}><td><Link className="sourceLink" href={`/characters/${row.characterId}`}>{row.character}</Link><small>{row.slotId} · {row.itemName}</small></td><td><Link className="sourceLink" href={`/characters/${donor.characterId}`}>{donor.character}</Link><small>{donor.slotId} · level {donor.level}</small></td><td>{donor.protection}</td></tr>))}</tbody></table></div>}</section></main>;
}
