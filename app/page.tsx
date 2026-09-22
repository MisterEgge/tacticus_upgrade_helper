import CharacterName from "./components/CharacterName";
import Link from "next/link";
import Nav from "./components/Nav";
import { getReport, unitFor } from "./lib/report";
import SyncAccountButton from "./components/SyncAccountButton";
import { dashboardFocus } from "../src/domain/dashboard";

function Card({ label, value, detail, href }: { label: string; value: number; detail: string; href: string })
{

    return <Link className="overviewCard card" href={href}><strong>{value}</strong><span>{label}</span><small>{detail}</small></Link>;

}

export default async function Home()
{

    const report = await getReport();
    if (!report) return <main><Nav/><div className="empty"><h2>No report yet</h2><p>Run <code>npm run refresh</code>, then reload.</p></div></main>;
    const gearRows = [...report.equipmentAllocation.equipNow, ...report.equipmentAllocation.buyWatch];
    const gearCharacters = new Set(gearRows.map(row => row.character));
    const abilityCharacters = new Set(report.abilityQueue.map(row => row.character));
    const focus = dashboardFocus(gearRows, report.abilityQueue);
    const reviewedGear = report.equipmentAllocation.compatibilityUnknown.length;
    const top = focus.slice(0, 8);

    return <main>
        <Nav/>
        <header><div><p className="eyebrow">ACCOUNT OVERVIEW</p><h1>{report.source.player}</h1><SyncAccountButton lastSynced={report.generatedAt}/></div><div className="power">Power <strong>{report.source.powerLevel}</strong></div></header>
        <section className="cards overviewCards">
            <Card label="Roster" value={report.summary.units} detail="synced units" href="/characters"/>
            <Card label="Characters needing attention" value={focus.length} detail="need gear or ability attention" href="/characters"/>
            <Card label="Gear focus" value={gearCharacters.size} detail={`${gearRows.length} slots across those characters`} href="/equipment"/>
            <Card label="Ability focus" value={abilityCharacters.size} detail="characters with a level-17 baseline gap" href="/abilities"/>
        </section>
        <section className="panel overviewPanel"><div className="sectionTitle"><div><p className="eyebrow">WHERE TO FOCUS</p><h2>Recommended next characters</h2><p className="sub">Each character appears once. Gear and ability work are combined so you can choose who to invest in next.</p></div><Link className="viewLink" href="/characters">View character roster →</Link></div>
            {top.length ? <div className="tableWrap"><table><thead><tr><th>Character</th><th>Upgrade focus</th><th>Plan</th></tr></thead><tbody>{top.map(row =>
                {

                    const unit = unitFor(report, row.character);
                    return <tr key={row.character}><td><CharacterName name={row.character} id={unit?.id} icon={unit?.icon}/></td><td>
                        {row.equipmentSlots ? <strong>{row.equipmentSlots} gear slot{row.equipmentSlots === 1 ? "" : "s"}</strong> : null}
                        {row.abilitySteps.length ? <small>{row.abilitySteps.map(step => `${step.name} ${step.level} → 17`).join(" · ")}</small> : null}
                    </td><td><Link className="viewLink" href={unit ? `/characters/${encodeURIComponent(unit.id)}` : "/characters"}>Open character →</Link></td></tr>;

                })}</tbody></table></div> : <div className="empty">No current gear or ability focus was found in this report.</div>}
        </section>
        {reviewedGear ? <p className="sub overviewNote">{reviewedGear} gear slot{reviewedGear === 1 ? " needs" : "s need"} compatibility review before it can be treated as an actionable upgrade.</p> : null}
        <footer>Generated {new Date(report.generatedAt).toLocaleString()}</footer>
    </main>;

}
