import Link from "next/link";
import Nav from "./components/Nav";
import { getReport, targetName } from "./lib/report";

function Card({label,value}:{label:string;value:number}) { return <div className="card"><strong>{value}</strong><span>{label}</span></div>; }

export default async function Home() {
  const report=await getReport();
  if(!report) return <main><Nav/><div className="empty"><h2>No report yet</h2><p>Run <code>npm run refresh</code>, then reload.</p></div></main>;
  const top=[...report.equipmentAllocation.equipNow,...report.equipmentAllocation.buyWatch].slice(0,5);
  return <main>
    <Nav/>
    <header><div><p className="eyebrow">TACTICUS UPGRADE HELPER</p><h1>{report.source.player}</h1></div><div className="power">Power <strong>{report.source.powerLevel}</strong></div></header>
    <section className="cards"><Card label="Characters" value={report.summary.units}/><Card label="Legendary gear upgrades" value={report.summary.legendaryUnderTierSlots}/><Card label="Equip now" value={report.equipmentAllocation.equipNow.length}/><Card label="Ability upgrades to 17" value={report.summary.individualAbilityUpgradesTo17}/></section>
    <section className="panel"><div className="sectionTitle"><div><p className="eyebrow">EQUIPMENT</p><h2>Highest-priority targets</h2></div><Link className="viewLink" href="/equipment">View all equipment →</Link></div>
    <div className="tableWrap"><table><thead><tr><th>Character</th><th>Current</th><th>Target</th><th>Status</th></tr></thead><tbody>
    {top.map(row=>{const now=report.equipmentAllocation.equipNow.includes(row);return <tr key={row.character+row.slotId}><td><strong>{row.character}</strong><small>{row.slotId}</small></td><td>{row.currentItem}</td><td><strong>{targetName(row)}</strong></td><td><span className={"status "+(now?"ready":"need")}>{now?"EQUIP NOW":"NEED"}</span></td></tr>})}
    </tbody></table></div></section>
    <footer>Generated {new Date(report.generatedAt).toLocaleString()}</footer>
  </main>;
}
