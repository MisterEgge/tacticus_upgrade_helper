"use client";
import ResourceName from "../components/ResourceName";
import Link from "next/link";
import Recipients from "../components/MaterialRecipients";
import DataTable, { type Column, type Filter } from "../components/DataTable";
import type { MaterialCompletionRow } from "../../src/domain/materialCompletion";

export const STATUS_LABELS = {
    "done-catalog": "Done — catalog", "done-owned": "Done — owned",
    stocked: "Stocked", farming: "Still needed", untracked: "No recorded use"
} as const;

export default function MaterialTable({ rows }: { rows: MaterialCompletionRow[] }) {
    const columns: Column<MaterialCompletionRow>[] = [
        { key: "material", label: "Material", sort: row => row.name, search: row => `${row.name} ${row.id} ${row.rarity} ${row.recipients.map(recipient => recipient.name).join(" ")}`,
            render: row => <><strong><ResourceName id={row.id} name={row.name}/></strong><small>{row.rarity} · {row.craftable ? "Crafted upgrade" : "Base material"}</small>
                {row.recipients.length > 0 && <Recipients key={row.id} recipients={row.recipients}/>}</> },
        { key: "status", label: "Completion", sort: row => STATUS_LABELS[row.status], render: row => <>
            <span className={`status ${row.status.startsWith("done") || row.status === "stocked" ? "ready" : row.status === "untracked" ? "unknown" : "need"}`}>{STATUS_LABELS[row.status]}</span>
            <small>{row.status === "done-catalog" ? "No remaining use in the current catalog" : row.status === "done-owned" ? "Unowned characters still use this" : row.status === "stocked" ? "Inventory covers remaining uses" : row.status === "untracked" ? "Usage unknown; keep for review" : "More needed for owned characters"}</small>
        </> },
        { key: "inventory", label: "Inventory", sort: row => row.inventory, render: row => <><strong>{row.inventory.toLocaleString()}</strong><small>{row.allocated.toLocaleString()} allocated · {row.surplus.toLocaleString()} unallocated</small></> },
        { key: "remaining", label: "Remaining uses", sort: row => row.remaining, render: row => row.status === "untracked" ? "Unknown" : <><strong>{row.remaining.toLocaleString()}</strong><small>Owned roster · includes crafting</small></> },
        { key: "shortage", label: "Still to collect / craft", sort: row => row.shortage, render: row => row.status === "untracked" ? "Unknown" : <>
            <strong className={row.shortage > 0 ? "below" : undefined}>{row.shortage.toLocaleString()}</strong>
            <small>{row.required.toLocaleString()} needed after owned parent upgrades</small>
            {row.shortage > 0 && <Link className="sourceLink" href={`/sources?item=${encodeURIComponent(row.id)}`}>Where to get it</Link>}
        </> },
        { key: "unowned", label: "Unowned demand", sort: row => row.unowned, render: row => row.status === "untracked" ? "Unknown" : <><strong>{row.unowned.toLocaleString()}</strong><small>From Stone I · inventory not deducted</small></> }
    ];
    const filters: Filter<MaterialCompletionRow>[] = [
        { key: "done", label: "Done for owned roster", matches: row => row.status.startsWith("done") },
        { key: "catalog", label: "Done for catalog", matches: row => row.status === "done-catalog" },
        { key: "stocked", label: "Stocked", matches: row => row.status === "stocked" },
        { key: "needed", label: "Still needed", matches: row => row.status === "farming" },
        { key: "future", label: "Unowned users", matches: row => row.unowned > 0 },
        { key: "base", label: "Base materials", matches: row => !row.craftable },
        { key: "review", label: "Unknown use", matches: row => row.status === "untracked" }
    ];
    return <DataTable rows={rows} columns={columns} filters={filters} placeholder="Search material or any character that uses it…"/>;
}
