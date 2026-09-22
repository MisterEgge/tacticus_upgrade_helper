import Nav from "../components/Nav";
import AbilityTable from "./AbilityTable";
import { getReport } from "../lib/report";
import { getCharacterCatalog, getAbilityBreakpoints } from "../lib/catalog";
import { abilityGuideRows } from "../../src/domain/abilities";
import { campaignIsComplete, requiredCampaignName, type CampaignBattleDefinition } from "../../src/domain/campaigns";
import { readFile } from "node:fs/promises";

export default async function Abilities()
{

    const [report, catalog, guidance, priorities, battleText, raidMetaText] = await Promise.all([getReport(), getCharacterCatalog(), getAbilityBreakpoints(), readFile("config/character_priorities.json", "utf8"), readFile("data/game/campaign-battles.json", "utf8"), readFile("config/raid_boss_meta.json", "utf8")]);
    const accountPriorities=JSON.parse(priorities) as Record<string,{priority:number;modes?:string[]}>;
    const rows = abilityGuideRows(catalog.characters, report?.roster ?? null, guidance, accountPriorities).filter(row=>row.owned);
    const battleCatalog=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
    const incompleteCampaigns=new Set((report?.campaignProgress??[]).filter(campaign=>!campaignIsComplete(campaign,battleCatalog)).map(requiredCampaignName));
    const campaignGroups=[...incompleteCampaigns].sort().map(name=>({name,characterIds:catalog.characters.filter(character=>character.campaignsRequiredIn.includes(name)).map(character=>character.id)})).filter(group=>group.characterIds.length);
    const reviewed = rows.filter(row => row.reviewed).length;
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your owned characters.</div></main>;
    return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Your Ability Upgrade Plan</h1>
        <p className="sub">Only your owned characters are shown. Character-specific community targets override the general planning ladder.</p>
        <p className="sub">Account report: {report.generatedAt}</p>
    </div><div className="power">{reviewed}/{rows.length}<strong> character-specific</strong></div></header>
        <section className="panel tablePanel"><AbilityTable rows={rows} campaignGroups={campaignGroups} raidMeta={JSON.parse(raidMetaText)}/></section>
    </main>;

}
