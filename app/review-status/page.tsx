import Nav from "../components/Nav";
import { getAbilityBreakpoints, getCampaignTargets, getCharacterCatalog } from "../lib/catalog";
import { readFile } from "node:fs/promises";

export default async function ReviewStatus()
{

    const [catalog, abilities, campaigns, sourceText] = await Promise.all([
        getCharacterCatalog(),
        getAbilityBreakpoints(),
        getCampaignTargets(),
        readFile("config/ability_breakpoint_sources.json", "utf8")
    ]);
    const sources = JSON.parse(sourceText) as Record<string, unknown>;
    const reviewedAbilities = catalog.characters.filter(character =>
    {

        const candidate = abilities[character.name] as any;
        return !!candidate?.active?.practical && !!candidate?.passive?.practical && !!candidate?.confidence && !["unreviewed", "researching", "baseline-only"].includes(candidate.confidence.toLowerCase());

    });
    const sourcedAbilities = reviewedAbilities.filter(character => Array.isArray(sources[character.name]) && (sources[character.name] as unknown[]).length > 0);
    const missingAbilities = catalog.characters.filter(character => !reviewedAbilities.some(reviewed => reviewed.id === character.id));
    const unsourcedAbilities = reviewedAbilities.filter(character => !sourcedAbilities.some(sourced => sourced.id === character.id));
    const campaignRows = Object.entries(campaigns.campaigns).flatMap(([campaign, value]) => Object.entries(value.characters).map(([character, target]) => ({ campaign, character, reviewed: Boolean(target.rank && target.evidence?.length) })));
    const reviewedCampaigns = campaignRows.filter(row => row.reviewed);
    const pendingCampaigns = campaignRows.filter(row => !row.reviewed);
    return <main><Nav/><header><div><p className="eyebrow">DATA QUALITY</p><h1>Review Coverage</h1><p className="sub">Separates missing research from legitimate unknown account/API state. A row is not considered reviewed merely because a baseline value exists.</p></div></header>
        <section className="cards compact">
            <div className="card"><strong>{reviewedAbilities.length}/{catalog.characters.length}</strong><span>Ability reviews</span><small>{missingAbilities.length} still need character-specific research</small></div>
            <div className="card"><strong>{sourcedAbilities.length}/{reviewedAbilities.length}</strong><span>Ability reviews with evidence</span><small>{unsourcedAbilities.length} reviewed entries still need auditable sources</small></div>
            <div className="card"><strong>{reviewedCampaigns.length}/{campaignRows.length}</strong><span>Campaign character targets</span><small>{pendingCampaigns.length} target rows still need research</small></div>
        </section>
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">ABILITY BACKLOG</p><h2>Characters still needing research</h2></div></div><p className="sub">{missingAbilities.map(character => character.name).join(" · ") || "None"}</p></section>
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">EVIDENCE BACKLOG</p><h2>Reviewed ability guidance missing source records</h2></div></div><p className="sub">{unsourcedAbilities.map(character => character.name).join(" · ") || "None"}</p></section>
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">CAMPAIGN BACKLOG</p><h2>Mandatory targets still needing research</h2></div></div><p className="sub">{pendingCampaigns.map(row => `${row.campaign}: ${row.character}`).join(" · ") || "None"}</p></section>
    </main>;

}
