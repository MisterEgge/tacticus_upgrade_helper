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
    return <main><Nav/><header><div><p className="eyebrow">ACCOUNT PLANNING</p><h1>Character Ratings</h1><p className="sub">A roster-specific investment guide for every character, using your selected teams, campaign progress, priorities, and available community evidence.</p></div><div className="power">{rows.length}<strong> catalog characters</strong><small>{rows.filter(row=>row.owned).length} owned · {rows.filter(row=>row.owned&&row.tier==="Low priority").length} low priority for this roster</small></div></header>
        <section className="panel detailPanel"><ReferenceDetails label="Rating criteria"><p>This is a roster investment guide, not a universal combat tier list. Core reflects your selected raid core, high community score, or high account priority; Strong adds raid meta cores; Useful includes LRE-focused priorities and unfinished Elite campaign needs; Situational includes researched modes, buildable War options, and raid flex. Low priority means no current account goal supports spending scarce resources; leave the character at the current rank unless you enjoy using them or a current LRE track needs them. Ratings recalculate from this account's selected Raid plan, owned War lineups, campaign progress, and the reviewed investment notes. LRE focus is included where recorded, but event-specific track eligibility is not scored because current event-track requirements are not in the dataset. Community scores are available for only the 30 characters in the supplied table.</p></ReferenceDetails><RatingTable rows={rows}/></section>
    </main>;
}
