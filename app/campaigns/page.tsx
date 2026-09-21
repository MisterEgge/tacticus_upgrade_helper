import Nav from "../components/Nav";
import CharacterName from "../components/CharacterName";
import { getReport } from "../lib/report";
import { getCampaignEvidence, getCampaignTargets, getCharacterCatalog } from "../lib/catalog";
import { requiredCampaignName } from "../../src/domain/campaigns";

const rankNames = ["Stone I", "Stone II", "Stone III", "Iron I", "Iron II", "Iron III", "Bronze I", "Bronze II", "Bronze III", "Silver I", "Silver II", "Silver III", "Gold I", "Gold II", "Gold III", "Diamond I", "Diamond II", "Diamond III", "Adamantine I", "Adamantine II"];

export default async function Campaigns()
{

    const [report, targets, catalog, evidence] = await Promise.all([getReport(), getCampaignTargets(), getCharacterCatalog(), getCampaignEvidence()]);
    if (!report) return <main><Nav/><div className="empty">Account data unavailable. Run <code>npm run refresh</code>.</div></main>;
    const roster = new Map(report.roster.map(unit => [unit.id, unit]));
    return <main>
        <Nav/>
        <header><div><p className="eyebrow">CAMPAIGNS</p><h1>Elite 3★ Upgrade Planner</h1>
            <p className="sub">Account data as of report {report.generatedAt}. Community targets remain RESEARCHING until supported by campaign-specific evidence.</p>
        </div></header>
        {Object.entries(targets.campaigns).map(([name, campaign]) =>
        {

            const progress = report.campaignProgress?.find(c => (c.type === "Elite" || c.type === "EliteMirror") && requiredCampaignName(c) === name);
            const required = catalog.characters.filter(c => c.campaignsRequiredIn.includes(name));
            return <section className="panel detailPanel" key={name}>
                <div className="sectionTitle"><div><p className="eyebrow">{campaign.status.toUpperCase()}</p><h2>{name} Elite</h2></div>
                    <div className="power">{progress?.highestCompletedBattle ?? "Unknown"}<strong> completed through · {progress?.highestUnlockedBattle ?? "unknown"} unlock frontier</strong></div>
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
                            <td><strong>{target?.rank ?? "RESEARCHING"}</strong>{target?.rank ? <small>{target.confidence ?? "Unknown"} confidence</small> : null}</td>
                            <td><strong>A {unit?.abilities[0]?.level ?? "—"} → {target?.active ?? "—"}</strong><small>P {unit?.abilities[1]?.level ?? "—"} → {target?.passive ?? "—"}</small></td>
                            <td><strong>{target?.role ?? "Unreviewed"}</strong><small>{target?.note ?? "Campaign-specific Elite 3★ research pending."}</small>{target?.evidence?.length ? <small>Evidence: {target.evidence.map((id, index) => { const source = evidence.sources[id]; return source ? <span key={id}>{index ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span> : null; })}</small> : null}</td>
                        </tr>;

                    })}</tbody>
                </table></div>
                <p className="sub">Current ranks do not establish the ranks used for earlier clears. Historical observations are saved by <code>npm run refresh</code>; roster changes alongside progress are correlation, not proof of cause.</p>
            </section>;

        })}
    </main>;

}
