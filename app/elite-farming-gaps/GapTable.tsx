"use client";
import ResourceName from "../components/ResourceName";
import Link from "next/link";
import DataTable, { type Column, type Filter } from "../components/DataTable";
import MaterialRecipients from "../components/MaterialRecipients";
import { campaignKey } from "../../src/domain/campaigns";
import type { EliteGap } from "../../src/domain/eliteFarmingGaps";

const labels = { locked: "Elite nodes locked", unknown: "Elite access unknown", "no-elite": "No Elite source in synced data" };
const amount = (value: number | null) => value === null ? "Unknown" : value.toLocaleString();

export default function GapTable({ rows }: { rows: EliteGap[] }) {
    const columns: Column<EliteGap>[] = [
        { key: "material", label: "Material / recipients", sort: row => row.name,
            search: row => `${row.name} ${row.id} ${row.rarity} ${row.characters.map(character => character.name).join(" ")}`,
            render: row => <><Link className="sourceLink" href={`/sources?item=${encodeURIComponent(row.id)}`}><strong><ResourceName id={row.id} name={row.name}/></strong></Link><small>{row.rarity}</small>
                {row.characters.length > 0 && <MaterialRecipients key={row.id} recipients={row.characters}/>}</> },
        { key: "elite", label: "Elite gap", sort: row => labels[row.coverage], search: row => row.eliteNodes.map(node => `${node.id} ${campaignKey(node.campaign, node.campaignType)}`).join(" "),
            render: row => <><span className={`status ${row.coverage === "locked" ? "need" : "unknown"}`}>{labels[row.coverage]}</span>
                {row.eliteNodes.length > 0 && <details className="referenceDetails"><summary>All {row.eliteNodes.length} Elite sources</summary><ul>{row.eliteNodes.map(node => <li key={node.id}>
                    <strong>{campaignKey(node.campaign, node.campaignType)} · battle {node.nodeNumber}</strong>
                    <small>{node.id} · {node.access === "unknown" ? "Progress unknown" : "Recorded locked"} · {(node.energyCost / node.rate).toFixed(1)} expected energy / drop</small>
                </li>)}</ul></details>}</> },
        { key: "shortage", label: "Owned roster need", sort: row => row.shortage ?? -1, render: row => <>
            <strong className={row.shortage !== null && row.shortage > 0 ? "below" : undefined}>{amount(row.shortage)} still to collect</strong>
            <small>{amount(row.inventory)} in inventory · {amount(row.remaining)} remaining uses including crafting</small>
            {row.status.startsWith("done") ? <small>No remaining use through selected ceiling</small> : row.status === "stocked" ? <small>Inventory covers remaining uses</small> : null}
        </> },
        { key: "alternative", label: "Best unlocked alternative", sort: row => row.alternative ? row.alternative.energyCost / row.alternative.rate : Number.MAX_SAFE_INTEGER,
            search: row => row.alternative ? `${row.alternative.id} ${row.alternative.campaign}` : "", render: row => row.alternative ? <>
                <strong>{campaignKey(row.alternative.campaign, row.alternative.campaignType)} · battle {row.alternative.nodeNumber}</strong>
                <small>{row.alternative.id} · {(row.alternative.energyCost / row.alternative.rate).toFixed(1)} expected energy / drop</small>
            </> : <span className="status unknown">No confirmed unlocked alternative</span> }
    ];
    const filters: Filter<EliteGap>[] = [
        { key: "locked", label: "Locked Elite nodes", matches: row => row.coverage === "locked" },
        { key: "none", label: "No Elite source", matches: row => row.coverage === "no-elite" },
        { key: "unknown", label: "Progress unknown", matches: row => row.coverage === "unknown" },
        { key: "legendary", label: "Legendary", matches: row => row.rarity === "Legendary" }
    ];
    return <DataTable rows={rows} columns={columns} filters={filters} placeholder="Search material, recipient, campaign or node…"/>;
}
