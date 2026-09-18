import CharacterName from "../components/CharacterName";
import Nav from "../components/Nav";
import { getReport, targetName, unitFor } from "../lib/report";

export default async function Equipment() {
  const report = await getReport();
  if (!report) return <main><Nav/><div className="empty"><h2>No report yet</h2><p>Run <code>npm run refresh</code>, then reload.</p></div></main>;

  const rows = [
    ...report.equipmentAllocation.equipNow.map(row => ({...row, state:"EQUIP NOW"})),
    ...report.equipmentAllocation.buyWatch.map(row => ({...row, state:"NEED"})),
    ...report.equipmentAllocation.compatibilityUnknown.map(row => ({...row, state:"UNKNOWN"}))
  ].sort((a,b) => b.accountPriority-a.accountPriority || a.character.localeCompare(b.character));

  return <main>
    <Nav/>
    <header><div><p className="eyebrow">EQUIPMENT</p><h1>Upgrade Queue</h1><p className="sub">Legendary characters with under-tier equipment, ordered by your account priority.</p></div>
    <div className="power">{rows.length} <strong>slots</strong></div></header>

    <section className="cards compact">
      <div className="card"><strong>{report.equipmentAllocation.equipNow.length}</strong><span>Equip now</span></div>
      <div className="card"><strong>{report.equipmentAllocation.buyWatch.length}</strong><span>Need to acquire</span></div>
      <div className="card"><strong>{report.equipmentAllocation.compatibilityUnknown.length}</strong><span>Needs review</span></div>
    </section>

    <section className="panel"><div className="tableWrap"><table>
      <thead><tr><th>#</th><th>Character</th><th>Account priority</th><th>Slot</th><th>Current</th><th>Preferred target</th><th>Status</th></tr></thead>
      <tbody>{rows.map((row,i)=><tr key={row.character+row.slotId}>
        <td>{i+1}</td><td><CharacterName name={row.character} id={unitFor(report,row.character)?.id}/></td><td>{row.accountPriority}</td><td>{row.slotId}</td>
        <td>{row.currentItem}<small>{row.currentRarity} · Level {row.currentLevel}</small></td>
        <td><strong>{targetName(row)}</strong></td>
        <td><span className={"status "+(row.state==="EQUIP NOW"?"ready":row.state==="NEED"?"need":"unknown")}>{row.state}</span></td>
      </tr>)}</tbody>
    </table></div></section>
    <footer>Generated {new Date(report.generatedAt).toLocaleString()}</footer>
  </main>;
}
