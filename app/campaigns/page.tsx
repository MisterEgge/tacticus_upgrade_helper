import Nav from "../components/Nav";
import CharacterName from "../components/CharacterName";
import { getReport } from "../lib/report";
import { getCampaignEvidence, getCampaignTargets, getCharacterCatalog } from "../lib/catalog";
import { abilityGap, campaignIsComplete, campaignRankGap, campaignRecommendationPriority, requiredCampaignName, type CampaignBattleDefinition } from "../../src/domain/campaigns";
import { readFile } from "node:fs/promises";

const rankNames = ["Stone I", "Stone II", "Stone III", "Iron I", "Iron II", "Iron III", "Bronze I", "Bronze II", "Bronze III", "Silver I", "Silver II", "Silver III", "Gold I", "Gold II", "Gold III", "Diamond I", "Diamond II", "Diamond III", "Adamantine I", "Adamantine II"];

export default async function Campaigns()
{

    const [report, targets, catalog, evidence, priorities, battleText] = await Promise.all([getReport(), getCampaignTargets(), getCharacterCatalog(), getCampaignEvidence(), readFile("config/character_priorities.json", "utf8").then(value => JSON.parse(value) as Record<string, { priority: number }>), readFile("data/game/campaign-battles.json", "utf8") ]);
    const battleCatalog = Object.values(JSON.parse(battleText) as Record<string, CampaignBattleDefinition>);
    if (!report) return <main><Nav/><div className="empty">Account data unavailable. Run <code>npm run refresh</code>.</div></main>;
    const roster = new Map(report.roster.map(unit => [unit.id, unit]));
    const recommendations = Object.entries(targets.campaigns).flatMap(([campaignName, campaign]) => { const progress = report.campaignProgress?.find(c => (c.type === "Elite" || c.type === "EliteMirror") && requiredCampaignName(c) === campaignName); const campaignComplete = campaignIsComplete(progress, battleCatalog); return catalog.characters.filter(character => character.campaignsRequiredIn.includes(campaignName)).map(character => { const unit = roster.get(character.id); const target = campaign.characters[character.name]; return campaignRecommendationPriority({ campaign: campaignName, campaignComplete, characterId: character.id, characterName: character.name, currentRank: unit?.rank ?? null, targetRank: target?.rank, role: target?.role, confidence: target?.confidence, accountPriority: priorities[character.name]?.priority ?? 0 }); }); }).filter(row => row.recommendationPriority > 0).sort((a, b) => b.recommendationPriority - a.recommendationPriority);
    return <main>
        <Nav/>
        <header><div><p className="eyebrow">CAMPAIGNS</p><h1>Elite 3★ Upgrade Planner</h1>
            <p className="sub">Account data as of report {report.generatedAt}. Community targets remain RESEARCHING until supported by campaign-specific evidence.</p>
        </div></header>
        {recommendations.length ? <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">NEXT INVESTMENTS</p><h2>Account-specific campaign priorities</h2></div><div className="power">{recommendations.length}<strong> rank gaps</strong></div></div><div className="tableWrap"><table><thead><tr><th>Character</th><th>Campaign</th><th>Target</th><th>Gap</th><th>Why</th></tr></thead><tbody>{recommendations.slice(0, 12).map(row => <tr key={row.campaign + row.characterId}><td><CharacterName name={row.characterName} id={row.characterId}/></td><td>{row.campaign}</td><td><strong>{row.targetRank}</strong></td><td><strong>{row.rankStepsRemaining}</strong><small>rank step(s)</small></td><td><strong>Priority {row.recommendationPriority}</strong><small>{row.reason}</small></td></tr>)}</tbody></table></div></section> : null}
        {Object.entries(targets.campaigns).map(([name, campaign]) =>
        {

            const progress = report.campaignProgress?.find(c => (c.type === "Elite" || c.type === "EliteMirror") && requiredCampaignName(c) === name);
            const required = catalog.characters.filter(c => c.campaignsRequiredIn.includes(name));
            const campaignComplete = campaignIsComplete(progress, battleCatalog);
            return <section className="panel detailPanel" key={name}>
                <div className="sectionTitle"><div><p className="eyebrow">{campaign.status.toUpperCase()}</p><h2>{name} Elite</h2></div>
                    <div className="power">{campaignComplete ? "Completed" : progress?.highestCompletedBattle ?? "Unknown"}<strong>{campaignComplete ? " · all Elite missions cleared" : ` completed through · ${progress?.highestUnlockedBattle ?? "unknown"} unlock frontier`}</strong></div>
                </div>
                <p className="sub">Confirmed 3★ progress: UNKNOWN — the available API schema does not expose stars. Unlock frontier N proves completion through N−1; a terminal frontier can be a sentinel, not a playable battle.</p>
                <div className="tableWrap"><table><thead><tr><th>Required character</th><th>Current account state</th><th>Suggested Elite target</th><th>Abilities current → target</th><th>Role / evidence</th></tr></thead>
                    <tbody>{required.map(character =>
                    {

                        const unit = roster.get(character.id);
                        const target = campaign.characters[character.name];
                        return <tr key={character.id}>
                            <td><CharacterName name={character.name} id={character.id}/></td>
                            <td><strong>{unit ? rankNames[unit.rank] ?? `Unknown rank (${unit.rank})` : "Not in account roster"}</strong></td>
                            <td><strong>{campaignComplete && unit ? rankNames[unit.rank] ?? `Unknown rank (${unit.rank})` : target?.rank ?? "RESEARCHING"}</strong>{campaignComplete ? <small>Campaign complete · current investment is sufficient for this account</small> : target?.rank ? <small>{target.confidence ?? "Unknown"} confidence · {unit ? `${campaignRankGap(unit.rank, target.rank) ?? "?"} rank step(s) remaining` : "current rank unavailable"}</small> : null}</td>
                            <td><strong>A {unit?.abilities[0]?.level ?? "—"} → {campaignComplete ? unit?.abilities[0]?.level ?? "—" : target?.active ?? "—"}</strong><small>P {unit?.abilities[1]?.level ?? "—"} → {campaignComplete ? unit?.abilities[1]?.level ?? "—" : target?.passive ?? "—"}{!campaignComplete && target?.passive && unit ? ` · ${abilityGap(unit.abilities[1]?.level, target.passive) ?? "?"} passive levels remaining` : ""}</small></td>
                            <td><strong>{target?.role ?? "Unreviewed"}</strong><small>{target?.note ?? "Campaign-specific Elite 3★ research pending."}</small>{target?.evidence?.length ? <small>Evidence: {target.evidence.map((id, index) => { const source = evidence.sources[id]; return source ? <span key={id}>{index ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span> : null; })}</small> : null}</td>
                        </tr>;

                    })}</tbody>
                </table></div>
                <p className="sub">Current ranks do not establish the ranks used for earlier clears. Historical observations are saved by <code>npm run refresh</code>; roster changes alongside progress are correlation, not proof of cause.</p>
            </section>;

        })}
    </main>;

}
