"use client";
import Link from "next/link";
import { useId, useState } from "react";
import type { EliteOpportunity } from "../../src/domain/eliteFarmingGaps";

function Unlock({ opportunity }: { opportunity: EliteOpportunity }) {
    const [open, setOpen] = useState(false);
    const bodyId = useId();
    return <section className="panel detailPanel campaignSection">
        <button type="button" className="campaignSectionToggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(value => !value)}>
            <div><h3>{opportunity.campaign}</h3><small>{opportunity.materials.length} materials with shortages · next useful unlock: battle {opportunity.nextNode}</small></div>
            <div className="campaignSectionStatus"><div className="power">{opportunity.comparedMaterials ? `~${Math.round(opportunity.estimatedSavings).toLocaleString()} energy` : "No comparison"}<strong> potential farming savings</strong></div><span className="campaignChevron" aria-hidden="true">{open ? "▴" : "▾"}</span></div>
        </button>
        {open && <div id={bodyId} className="campaignSectionBody">
            <p>Recorded unlocked through battle {opportunity.frontier}. Unlocking through battle {opportunity.targetNode} would cover these materials.</p>
            <Link className="sourceLink" href="/campaigns">Review campaign characters and upgrade gaps</Link>
            <div className="tableWrap"><table><thead><tr><th>Material</th><th>Unlock battle</th><th>Shortage</th><th>Potential energy saved</th></tr></thead><tbody>
                {opportunity.materials.map(material => <tr key={material.id}><td><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(material.id)}`}>{material.name}</Link></td><td>{material.node.nodeNumber}<small>{material.node.id}</small></td><td>{material.shortage.toLocaleString()}</td><td>{material.estimatedSavings === null ? "No unlocked alternative to compare" : `~${Math.round(material.estimatedSavings).toLocaleString()}`}</td></tr>)}
            </tbody></table></div>
        </div>}
    </section>;
}

export default function CampaignUnlocks({ opportunities }: { opportunities: EliteOpportunity[] }) {
    return <section><h2>Campaign unlock opportunities</h2><p className="sub">Ranked by estimated farming energy saved across your remaining shortages. Each campaign is a separate option; overlapping benefits cannot be added together.</p>
        {opportunities.length ? opportunities.map(opportunity => <Unlock key={opportunity.campaign} opportunity={opportunity}/>) : <div className="empty">No confirmed locked Elite unlocks with known material shortages for these filters.</div>}
    </section>;
}
