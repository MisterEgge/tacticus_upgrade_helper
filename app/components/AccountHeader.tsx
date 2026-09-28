import Link from "next/link";
import type { Report } from "../lib/report";
import { getCharacterCatalog } from "../lib/catalog";
import SyncAccountButton from "./SyncAccountButton";

export default async function AccountHeader({ report }: { report: Report | null })
{
    const catalog = await getCharacterCatalog();
    const characterIds = new Set(catalog.characters.map(character => character.id));
    const unlocked = report ? new Set(report.roster.filter(unit => characterIds.has(unit.id)).map(unit => unit.id)).size : null;
    const owned = new Set(report?.roster.map(unit => unit.name) ?? []);
    const raidTeam = ["Kariyan", "Laviscus", "Trajann", "Aesoth", "Gulgortz"];
    const available = raidTeam.filter(name => owned.has(name));

    return <div className="accountBar"><div className="accountBarInner">
        <div className="accountIdentity"><small>ACCOUNT</small><Link href="/">{report?.source.player ?? "No account loaded"}</Link></div>
        <div className="accountMetric"><small>LEVEL</small><strong>{report?.source.powerLevel ?? "—"}</strong></div>
        <div className="accountMetric"><small>POWER</small><strong title="Total account power is not provided by the current player API">—</strong></div>
        <div className="accountMetric"><small>CHARACTERS UNLOCKED</small><strong>{unlocked === null ? "—" : unlocked}/{catalog.characters.length}</strong></div>
        <div className="accountRaid"><small>MAIN RAID TEAM · <Link href="/guild-raid">BIG HIT ↗</Link></small><strong>{report ? `${available.length}/${raidTeam.length} owned` : "—"}</strong><span>{report ? raidTeam.join(" · ") : "Sync to load your roster"}</span></div>
        <SyncAccountButton {...(report ? { lastSynced: report.generatedAt } : {})}/>
    </div></div>;
}
