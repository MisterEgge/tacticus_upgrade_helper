import Link from "next/link";
import type { Report } from "../lib/report";
import SyncAccountButton from "./SyncAccountButton";
import type { RaidSelection } from "../../src/domain/raidSelection";

export default async function AccountHeader({ report, raidSelection, raidLineup }: { report: Report | null; raidSelection: RaidSelection; raidLineup: string[] })
{
    const owned = new Set(report?.roster.map(unit => unit.name) ?? []);
    const available = raidLineup.filter(name => owned.has(name));

    return <div className="accountBar"><div className="accountBarInner">
        <div className="accountIdentity"><small>ACCOUNT</small><Link href="/">{report?.source.player ?? "No account loaded"}</Link></div>
        <div className="accountMetric"><small>LEVEL</small><strong>{report?.source.powerLevel ?? "—"}</strong></div>
        <div className="accountRaid"><small>MAIN RAID TEAM · <Link href="/guild-raid">{raidSelection.teamName} ↗</Link></small><strong>{report ? `${available.length}/5 owned` : "—"}</strong><span>{raidSelection.boss} · {raidLineup.join(" · ")}{raidSelection.machine ? ` · MoW: ${raidSelection.machine}` : " · No owned Machine of War"}</span></div>
        <SyncAccountButton {...(report ? { lastSynced: report.generatedAt } : {})}/>
    </div></div>;
}
