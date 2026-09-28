import Link from "next/link";
import type { Report } from "../lib/report";
import SyncAccountButton from "./SyncAccountButton";

export default function AccountHeader({ report }: { report: Report | null })
{
    const owned = new Set(report?.roster.map(unit => unit.name) ?? []);
    const raidTeam = ["Kariyan", "Laviscus", "Trajann", "Aesoth", "Gulgortz"];
    const available = raidTeam.filter(name => owned.has(name));

    return <div className="accountBar"><div className="accountBarInner">
        <div className="accountIdentity"><small>ACCOUNT</small><Link href="/">{report?.source.player ?? "No account loaded"}</Link></div>
        <div className="accountMetric"><small>LEVEL</small><strong>{report?.source.powerLevel ?? "—"}</strong></div>
        <div className="accountMetric"><small>POWER</small><strong title="Total account power is not provided by the current player API">—</strong></div>
        <div className="accountMetric"><small>CHARACTERS UNLOCKED</small><strong>{report?.roster.length ?? "—"}</strong></div>
        <div className="accountRaid"><small>MAIN RAID TEAM · <Link href="/guild-raid">BIG HIT ↗</Link></small><strong>{report ? `${available.length}/${raidTeam.length} owned` : "—"}</strong><span>{report ? raidTeam.join(" · ") : "Sync to load your roster"}</span></div>
        <SyncAccountButton {...(report ? { lastSynced: report.generatedAt } : {})}/>
    </div></div>;
}
