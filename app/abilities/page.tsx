import Nav from "../components/Nav";
import AbilityTable from "./AbilityTable";
import { getReport } from "../lib/report";
import { getCharacterCatalog, getAbilityBreakpoints } from "../lib/catalog";
import { abilityGuideRows } from "../../src/domain/abilities";
import { readFile } from "node:fs/promises";

export default async function Abilities()
{

    const [report, catalog, guidance, priorities] = await Promise.all([getReport(), getCharacterCatalog(), getAbilityBreakpoints(), readFile("config/character_priorities.json", "utf8")]);
    const rows = abilityGuideRows(catalog.characters, report?.roster ?? null, guidance, JSON.parse(priorities));
    const reviewed = rows.filter(row => row.reviewed).length;
    return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Game-wide Ability Guide</h1>
        <p className="sub">Every character has a planning ladder: level 17 baseline, level 35 general stop, and level 44–50 only for a deliberate high-investment build. Character-specific community targets override that ladder when reviewed.</p>
        <p className="sub">{report ? `Account report: ${report.generatedAt}` : "Account data unavailable — ownership and current levels are unknown. Run npm run refresh to update."}</p>
    </div><div className="power">{reviewed}/{rows.length}<strong> character-specific</strong></div></header>
        <section className="panel tablePanel"><AbilityTable rows={rows}/></section>
    </main>;

}
