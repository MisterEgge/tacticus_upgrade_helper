import Nav from "../components/Nav";
import AbilityTable from "./AbilityTable";
import { getReport } from "../lib/report";
import { getCharacterCatalog, getAbilityBreakpoints } from "../lib/catalog";
import { abilityActionQueue, abilityGuideRows } from "../../src/domain/abilities";
import CharacterName from "../components/CharacterName";
import { campaignIsComplete, requiredCampaignName, type CampaignBattleDefinition } from "../../src/domain/campaigns";
import { readFile } from "node:fs/promises";

export default async function Abilities()
{

    const [report, catalog, guidance, priorities, battleText, raidMetaText, communityText] = await Promise.all([getReport(), getCharacterCatalog(), getAbilityBreakpoints(), readFile("config/character_priorities.json", "utf8"), readFile("data/game/campaign-battles.json", "utf8"), readFile("config/raid_boss_meta.json", "utf8"),readFile("config/community_character_priorities.json","utf8")]);
    const accountPriorities=JSON.parse(priorities) as Record<string,{priority:number;modes?:string[]}>;
    const rows = abilityGuideRows(catalog.characters, report?.roster ?? null, guidance, accountPriorities).filter(row=>row.owned);
    const community=JSON.parse(communityText)as {characters:Array<{name:string;score:number;teams:string[]}>};
    const directQueue=abilityActionQueue(rows,accountPriorities,Object.fromEntries(community.characters.map(character=>[character.name,character]))).slice(0,10);
    const battleCatalog=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
    const incompleteCampaigns=new Set((report?.campaignProgress??[]).filter(campaign=>!campaignIsComplete(campaign,battleCatalog)).map(requiredCampaignName));
    const campaignGroups=[...incompleteCampaigns].sort().map(name=>({name,characterIds:catalog.characters.filter(character=>character.campaignsRequiredIn.includes(name)).map(character=>character.id)})).filter(group=>group.characterIds.length);
    const reviewed = rows.filter(row => row.reviewed).length;
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your owned characters.</div></main>;
    return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Your Ability Upgrade Plan</h1>
        <p className="sub">Only your owned characters are shown. Character-specific community targets override the general planning ladder.</p>
        <p className="sub">Account report: {report.generatedAt}</p>
    </div><div className="power">{reviewed}/{rows.length}<strong> character-specific</strong></div></header>
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">DO THIS NEXT</p><h2>Direct ability upgrade queue</h2><p className="sub">Community ranking, your account goals, and the character-specific ability target all agree on these next moves. This is a queue—not a generic list of every gap.</p></div><div className="power">{directQueue.length}<strong>next upgrades</strong></div></div><div className="tableWrap"><table><thead><tr><th>Character</th><th>Upgrade next</th><th>Current → target</th><th>Why now</th></tr></thead><tbody>{directQueue.map((row,index)=><tr key={row.id+row.next.ability}><td><small>#{index+1}</small><CharacterName name={row.character} id={row.id} icon={row.icon}/></td><td><strong>{row.next.ability}: {row.next.name}</strong><small>{row.next.weight>=5?"Ability-specific priority":"Practical target gap"}</small></td><td className="below">{row.next.level??"UNKNOWN"} → {row.next.target}<small>{Math.max(0,row.next.target-(row.next.level??row.next.target))} levels remaining</small></td><td>{row.communityScore?`Community score ${row.communityScore.toFixed(2)}`:"Account/campaign priority"}<small>{row.communityTeams.join(" · ")||row.basis}</small></td></tr>)}</tbody></table></div></section><section className="panel tablePanel"><AbilityTable rows={rows} campaignGroups={campaignGroups} raidMeta={JSON.parse(raidMetaText)}/></section>
    </main>;

}
