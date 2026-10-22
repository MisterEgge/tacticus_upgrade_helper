import CharacterName from "./components/CharacterName";
import Link from "next/link";
import Nav from "./components/Nav";
import {getReport} from "./lib/report";
import {getAccountActions} from "./lib/accountActions";
import {rankAccountActions} from "../src/domain/dashboard";

export default async function Home(){
 const report=await getReport();
 if(!report)return <main><Nav/><div className="empty"><h2>No report yet</h2><p>Run <code>npm run refresh</code>, then reload.</p></div></main>;
 const {rows,equipment}=await getAccountActions(report);
 const focus=rankAccountActions(rows,new Set(equipment.raidNames)).slice(0,8);
 return <main><Nav/><header><div><p className="eyebrow">ACCOUNT OVERVIEW</p><h1>Dashboard</h1></div></header>
  <section className="panel overviewPanel"><div className="sectionTitle"><div><h2>Next upgrades</h2><p className="sub">Your selected Raid team comes first. Check shared resource balances and coins before spending.</p></div><Link className="viewLink" href="/characters">All characters →</Link></div>
   {focus.length?<div className="tableWrap"><table><thead><tr><th>Character</th><th>Next action</th></tr></thead><tbody>{focus.map(row=><tr key={row.id}><td><CharacterName name={row.name} id={row.id} icon={row.icon}/>{equipment.raidNames.includes(row.name)?<small>Raid team</small>:null}</td><td>{row.actions.map(action=><div key={action.kind}><Link href={action.href}>{action.label}</Link><small>{action.detail}</small></div>)}</td></tr>)}</tbody></table></div>:<div className="empty">No current upgrades found.</div>}
  </section>
 </main>;
}
