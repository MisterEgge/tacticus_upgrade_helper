import ReferenceDetails from "../components/ReferenceDetails";
import Nav from "../components/Nav";
import {getReport} from "../lib/report";
import {getCharacterCatalog} from "../lib/catalog";
import {getUtilityRatings} from "../lib/utilityRatings";
import RatingTable from "./RatingTable";

export default async function Ratings()
{
    const report=await getReport();
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your account.</div></main>;
    const [ratings,catalog]=await Promise.all([getUtilityRatings(report),getCharacterCatalog()]);
    const owned=new Set(report.roster.map(unit=>unit.id));
    const rows=ratings.map((rating,index)=>({...rating,id:catalog.characters[index]!.id,alliance:catalog.characters[index]!.alliance,owned:owned.has(catalog.characters[index]!.id)}));
    return <main><Nav/><header><div><p className="eyebrow">ACCOUNT PLANNING</p><h1>Character Ratings</h1><p className="sub">Planning tiers used by the badge budget.</p></div><div className="power">{rows.length}<strong> catalog characters</strong><small>{rows.filter(row=>row.owned).length} owned · {rows.filter(row=>row.tier==="No tracked signal").length} need more evidence</small></div></header>
        <section className="panel detailPanel"><ReferenceDetails label="Rating criteria"><p>This is an account planning rating, not an overall combat tier. Core reflects your selected raid core, high community score, or high account priority; Strong adds raid meta cores; Useful includes unfinished Elite campaign needs; Situational includes buildable War source options and raid flex. “No tracked signal” means we lack evidence, not that a character is bad. The community score is shown only for the 30 characters in your supplied table.</p></ReferenceDetails><RatingTable rows={rows}/></section>
    </main>;
}
