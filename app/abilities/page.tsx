import Nav from "../components/Nav";
import AbilityTable from "./AbilityTable";
import { getReport } from "../lib/report";
import { getCharacterCatalog, getAbilityBreakpoints } from "../lib/catalog";
import { abilityGuideRows, abilityUpgradePlan } from "../../src/domain/abilities";
import Link from "next/link";
import { readFile } from "node:fs/promises";

export default async function Abilities()
{

    const [report, catalog, guidance, priorities] = await Promise.all([getReport(), getCharacterCatalog(), getAbilityBreakpoints(), readFile("config/character_priorities.json", "utf8")]);
    const accountPriorities=JSON.parse(priorities) as Record<string,{priority:number;modes?:string[]}>;
    const rows = abilityGuideRows(catalog.characters, report?.roster ?? null, guidance, accountPriorities);
    const plan=abilityUpgradePlan(rows,accountPriorities,["Guild Raid","Guild War"]);
    const reviewed = rows.filter(row => row.reviewed).length;
    return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Game-wide Ability Guide</h1>
        <p className="sub">Every character has a planning ladder: level 17 baseline, level 35 general stop, and level 44–50 only for a deliberate high-investment build. Character-specific community targets override that ladder when reviewed.</p>
        <p className="sub">{report ? `Account report: ${report.generatedAt}` : "Account data unavailable — ownership and current levels are unknown. Run npm run refresh to update."}</p>
    </div><div className="power">{reviewed}/{rows.length}<strong> character-specific</strong></div></header>
        {report?<section className="panel"><div className="sectionTitle"><div><p className="eyebrow">YOUR CURRENT GOALS</p><h2>Guild Raid &amp; Guild War ability plan</h2><p className="sub">Ranked from your account’s goal tags and character focus. Each entry shows the next ability that is furthest from its normal target.</p></div></div><div className="targetGrid">{plan.slice(0,6).map(row=><div key={row.id}><small>{row.modes.filter(mode=>mode==="Guild Raid"||mode==="Guild War").join(" · ")}</small><strong><Link className="characterLink" href={`/characters/${row.id}`}>{row.character}</Link></strong><span>{row.next.name}: level {row.next.level??"unknown"} → {row.next.target}</span></div>)}</div>{!plan.length?<div className="empty">No owned Raid/War character currently falls below its shown ability target.</div>:null}</section>:null}
        <section className="panel tablePanel"><AbilityTable rows={rows}/></section>
    </main>;

}
