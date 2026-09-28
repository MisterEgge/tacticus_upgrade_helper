import Nav from "../components/Nav";
import CharacterName from "../components/CharacterName";
import { getAbilityBreakpoints, getCampaignTargets, getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";
import { readFile } from "node:fs/promises";
import { formatAbilityName } from "../../src/domain/abilities";
import { abilityResearchRows, hasCharacterSpecificAbilityGuidance } from "../../src/domain/abilityReview";

type PlanningEntry = { active:number; passive:number; note:string; source?:string };

export default async function ReviewStatus()
{
    const [catalog, abilities, campaigns, sourceText, planningText, report, priorityText] = await Promise.all([
        getCharacterCatalog(), getAbilityBreakpoints(), getCampaignTargets(),
        readFile("config/ability_breakpoint_sources.json", "utf8"),
        readFile("config/owned_ability_recommendations.json", "utf8"),
        getReport(), readFile("config/character_priorities.json", "utf8")
    ]);
    const sources = JSON.parse(sourceText) as Record<string,unknown>;
    const planning = JSON.parse(planningText) as Record<string,PlanningEntry>;
    const priorities = JSON.parse(priorityText) as Record<string,{ modes?:string[] }>;
    const reviewed = catalog.characters.filter(character => hasCharacterSpecificAbilityGuidance(abilities[character.name]));
    const sourced = reviewed.filter(character => Array.isArray(sources[character.name]) && (sources[character.name] as unknown[]).length > 0);
    const rows = report ? abilityResearchRows(catalog.characters, report.roster, abilities, sources, priorities) : [];
    const planningRows = rows.filter(row => row.status === "Planning recommendation");
    const targetBacklog = rows.filter(row => row.status === "Targets needed");
    const evidenceBacklog = rows.filter(row => row.status === "Evidence needed");
    const campaignRows = Object.entries(campaigns.campaigns).flatMap(([campaign,value]) =>
        Object.entries(value.characters).map(([character,target]) => ({ campaign, character, reviewed:Boolean(target.rank && target.evidence?.length) })));
    const pendingCampaigns = campaignRows.filter(row => !row.reviewed);

    return <main><Nav/>
        <header><div><p className="eyebrow">DATA QUALITY</p><h1>Review Coverage</h1>
            <p className="sub">Every owned character has a recommended active and passive level. Planning recommendations are identified separately from character-specific community breakpoints.</p>
        </div></header>
        <section className="cards compact">
            <div className="card"><strong>{report ? rows.length - targetBacklog.length : "—"}/{report ? rows.length : "—"}</strong><span>Owned characters with recommended levels</span><small>{planningRows.length} planning recommendations need community validation</small></div>
            <div className="card"><strong>{reviewed.length}/{catalog.characters.length}</strong><span>Character-specific reviews</span><small>{evidenceBacklog.length} owned reviews still need source records</small></div>
            <div className="card"><strong>{sourced.length}/{reviewed.length}</strong><span>Reviews with evidence</span><small>{pendingCampaigns.length} of {campaignRows.length} campaign targets still need research</small></div>
        </section>
        {report ? <section className="panel detailPanel"><div className="sectionTitle"><div>
            <p className="eyebrow">ABILITY RECOMMENDATIONS</p><h2>Every owned character</h2>
            <p className="sub">All owned characters appear here, including those already at their targets. Planning numbers are account calls; community reviews and their source records are marked separately.</p>
        </div><div className="power">{planningRows.length}<strong> planning calls</strong></div></div>
            <div className="tableWrap"><table><thead><tr><th>Character</th><th>Active</th><th>Passive</th><th>Reason and evidence</th><th>Status</th></tr></thead>
                <tbody>{rows.map(row => {
                    const entry = planning[row.name];
                    const reviewedTarget = abilities[row.name] as {active?:{practical?:string};passive?:{practical?:string}}|undefined;
                    const evidence = sources[row.name] as Array<{url?:string}>|undefined;
                    return <tr key={row.id}>
                        <td><CharacterName name={row.name} id={row.id}/></td>
                        <td>{formatAbilityName(row.active)}<small>{row.activeLevel ?? "UNKNOWN"} → {row.activeTarget ?? reviewedTarget?.active?.practical ?? "RESEARCHING"}</small></td>
                        <td>{formatAbilityName(row.passive)}<small>{row.passiveLevel ?? "UNKNOWN"} → {row.passiveTarget ?? reviewedTarget?.passive?.practical ?? "RESEARCHING"}</small></td>
                        <td>{entry?.note ?? ([...row.campaigns,...row.modes].join(" · ") || "Character-specific guidance")}{entry?.source ? <small><a href={entry.source} target="_blank" rel="noreferrer">Community discussion</a></small> : evidence?.[0]?.url ? <small><a href={evidence[0].url} target="_blank" rel="noreferrer">Breakpoint evidence</a></small> : null}</td>
                        <td className="below">{row.status}<small>{row.status === "Evidence needed" ? "Verify the existing breakpoint" : row.status === "Planning recommendation" ? "Editorial target; validate against community evidence" : "No recommendation recorded"}</small></td>
                    </tr>;
                })}</tbody>
            </table></div>
        </section> : <section className="empty">Run <code>npm run refresh</code> to match ability research to your account roster.</section>}
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">CAMPAIGN BACKLOG</p><h2>Mandatory targets still needing research</h2></div></div>
            <p className="sub">{pendingCampaigns.map(row => `${row.campaign}: ${row.character}`).join(" · ") || "None"}</p>
        </section>
    </main>;
}
