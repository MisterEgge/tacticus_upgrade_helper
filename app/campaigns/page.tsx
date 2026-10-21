import RankBadge from "../components/RankBadge";
import CampaignRecommendationGroup from "./CampaignRecommendationGroup";
import CampaignRecommendations from "./CampaignRecommendations";
import Nav from "../components/Nav";
import ReferenceDetails from "../components/ReferenceDetails";
import CharacterName from "../components/CharacterName";
import CampaignSection from "./CampaignSection";
import ThreeStarProgress from "./ThreeStarProgress";
import { getReport } from "../lib/report";
import { getCampaignEvidence, getCampaignTargets, getCharacterCatalog } from "../lib/catalog";
import { campaignIsComplete, campaignRankGap, campaignRecommendationPriority, finalCampaignBattle, requiredCampaignName, type CampaignBattleDefinition } from "../../src/domain/campaigns";
import { readFile } from "node:fs/promises";
import { formatAbilityTarget } from "../../src/domain/targetDisplay";

export default async function Campaigns()
{

    const [report, targets, catalog, evidence, priorities, battleText] = await Promise.all([getReport(), getCampaignTargets(), getCharacterCatalog(), getCampaignEvidence(), readFile("config/character_priorities.json", "utf8").then(value => JSON.parse(value) as Record<string, { priority: number }>), readFile("data/game/campaign-battles.json", "utf8") ]);
    const battleCatalog = Object.values(JSON.parse(battleText) as Record<string, CampaignBattleDefinition>);
    if (!report) return <main><Nav/><div className="empty">Account data unavailable. Run <code>npm run refresh</code>.</div></main>;
    const roster = new Map(report.roster.map(unit => [unit.id, unit]));
    const recommendations = Object.entries(targets.campaigns).flatMap(([campaignName, campaign]) => { const progress = report.campaignProgress?.find(c => (c.type === "Elite" || c.type === "EliteMirror") && requiredCampaignName(c) === campaignName); const campaignComplete = campaignIsComplete(progress, battleCatalog); return catalog.characters.filter(character => character.campaignsRequiredIn.includes(campaignName)).map(character => { const unit = roster.get(character.id); const target = campaign.characters[character.name]; return campaignRecommendationPriority({ campaign: campaignName, campaignComplete, characterId: character.id, characterName: character.name, currentRank: unit?.rank ?? null, targetRank: target?.rank, role: target?.role, confidence: target?.confidence, accountPriority: priorities[character.name]?.priority ?? 0 }); }); }).filter(row => row.recommendationPriority > 0).sort((a, b) => a.campaign.localeCompare(b.campaign) || b.recommendationPriority - a.recommendationPriority);
    return <main>
        <Nav/>
        <header><div><p className="eyebrow">CAMPAIGNS</p><h1>Elite 3★ Upgrade Planner</h1>
            <p className="sub">Upgrades for your next Elite clears.</p>
            <ReferenceDetails label="About campaign targets"><p>Targets marked RESEARCHING still need campaign-specific evidence.</p><p>Current ranks do not show which upgrades were used for earlier clears. Campaign history records progress alongside roster changes; it cannot prove which upgrade caused a clear.</p></ReferenceDetails>
        </div></header>
        {recommendations.length ? <CampaignRecommendations count={recommendations.length}>{Object.entries(Object.groupBy(recommendations.slice(0, 12), row => row.campaign)).map(([campaignName, rows]) => <CampaignRecommendationGroup key={campaignName} name={campaignName} count={rows?.length??0}><div className="tableWrap"><table><thead><tr><th>Character</th><th>Target</th><th>Gap</th><th>Why</th></tr></thead><tbody>{rows?.map(row => <tr key={row.campaign + row.characterId}><td><CharacterName name={row.characterName} id={row.characterId}/></td><td><strong><RankBadge rank={row.targetRank}/></strong></td><td><strong>{row.rankStepsRemaining}</strong><small>rank step(s)</small></td><td><strong>{row.reason}</strong></td></tr>)}</tbody></table></div></CampaignRecommendationGroup>)}</CampaignRecommendations> : null}
        {Object.entries(targets.campaigns).map(([name, campaign]) =>
        {

            const progress = report.campaignProgress?.find(c => (c.type === "Elite" || c.type === "EliteMirror") && requiredCampaignName(c) === name);
            const required = catalog.characters.filter(c => c.campaignsRequiredIn.includes(name));
            const campaignComplete = campaignIsComplete(progress, battleCatalog);
            const finalBattle = progress
                ? finalCampaignBattle(progress.name, progress.type, battleCatalog)
                : finalCampaignBattle(name, / Mirror$/i.test(name) ? "EliteMirror" : "Elite", battleCatalog);
            const progressLabel = <>{campaignComplete ? "Completed" : progress?.highestCompletedBattle ?? "Unknown"}<strong>{campaignComplete ? " · all Elite missions cleared" : ` completed through · ${progress?.highestUnlockedBattle ?? "unknown"} unlock frontier`}</strong></>;
            return <CampaignSection key={name} status={campaign.status} name={name} progressLabel={progressLabel} finalBattle={finalBattle}>
                <ThreeStarProgress campaign={name} finalBattle={finalBattle}/>
                <div className="tableWrap"><table><thead><tr><th>Character</th><th>Rank</th><th>Elite target</th><th>Abilities</th><th>Role</th></tr></thead>
                    <tbody>{required.map(character =>
                    {

                        const unit = roster.get(character.id);
                        const target = campaign.characters[character.name];
                        const rankMet = Boolean(unit && (campaignComplete || campaignRankGap(unit.rank,target?.rank)===0));
                        return <tr key={character.id}>
                            <td><CharacterName name={character.name} id={character.id}/></td>
                            <td><strong>{unit ? <RankBadge rank={unit.rank}/> : "Not in account roster"}</strong></td>
                            <td><strong>{rankMet ? "Target met" : target?.rank ? <RankBadge rank={target.rank}/> : "RESEARCHING"}</strong>{!campaignComplete && !rankMet && target?.rank ? <small>{target.confidence ?? "Unknown"} confidence · {unit ? `${campaignRankGap(unit.rank, target.rank) ?? "?"} rank step(s) remaining` : "current rank unavailable"}</small> : null}</td>
                            <td><strong>A {formatAbilityTarget(unit?.abilities[0]?.level,campaignComplete && unit ? unit.abilities[0]?.level : target?.active)}</strong><small>P {formatAbilityTarget(unit?.abilities[1]?.level,campaignComplete && unit ? unit.abilities[1]?.level : target?.passive)}</small></td>
                            <td><strong>{target?.role ?? "Unreviewed"}</strong><ReferenceDetails label="Target details"><p>{target?.note ?? "Campaign-specific Elite 3★ research pending."}</p>{target?.evidence?.length ? <small>Evidence: {target.evidence.map((id, index) => { const source = evidence.sources[id]; return source ? <span key={id}>{index ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span> : null; })}</small> : null}</ReferenceDetails></td>
                        </tr>;

                    })}</tbody>
                </table></div>
            </CampaignSection>;

        })}
    </main>;

}
