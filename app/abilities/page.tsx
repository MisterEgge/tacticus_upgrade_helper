import Nav from "../components/Nav";
import AbilityTable from "./AbilityTable";
import { getReport } from "../lib/report";
import { getCharacterCatalog, getAbilityBreakpoints } from "../lib/catalog";
import { abilityGuideRows } from "../../src/domain/abilities";
import { readFile } from "node:fs/promises";

export default async function Abilities()
{

    const [report, catalog, guidance, priorities] = await Promise.all([getReport(), getCharacterCatalog(), getAbilityBreakpoints(), readFile("config/character_priorities.json", "utf8")]);
    const accountPriorities=JSON.parse(priorities) as Record<string,{priority:number;modes?:string[]}>;
    const rows = abilityGuideRows(catalog.characters, report?.roster ?? null, guidance, accountPriorities).filter(row=>row.owned);
    const campaignIds=catalog.characters.filter(character=>character.requiredInCampaign).map(character=>character.id);
    const reviewed = rows.filter(row => row.reviewed).length;
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your owned characters.</div></main>;
    return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Your Ability Upgrade Plan</h1>
        <p className="sub">Only your owned characters are shown. Character-specific community targets override the general planning ladder.</p>
        <p className="sub">Account report: {report.generatedAt}</p>
    </div><div className="power">{reviewed}/{rows.length}<strong> character-specific</strong></div></header>
        <section className="panel tablePanel"><AbilityTable rows={rows} campaignIds={campaignIds}/></section>
    </main>;

}
