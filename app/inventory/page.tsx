import Nav from "../components/Nav"; import {getReport} from "../lib/report";
export default async function Inventory(){const r=await getReport();if(!r)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
const rows=[...r.unequippedInventory].sort((a,b)=>b.amount-a.amount||(a.name??a.id).localeCompare(b.name??b.id));
return <main><Nav/><header><div><p className="eyebrow">INVENTORY</p><h1>Unequipped Inventory</h1><p className="sub">Searchable display is next; this view exposes everything currently returned by the player API.</p></div><div className="power">{rows.reduce((n,x)=>n+x.amount,0)} <strong>items</strong></div></header>
<section className="panel"><div className="tableWrap"><table><thead><tr><th>Item</th><th>Amount</th><th>Level</th><th>Internal ID</th></tr></thead><tbody>
{rows.map(x=><tr key={x.id+"-"+x.level}><td><strong>{x.name??x.id}</strong></td><td>{x.amount}</td><td>{x.level}</td><td><small>{x.id}</small></td></tr>)}
</tbody></table></div></section></main>}