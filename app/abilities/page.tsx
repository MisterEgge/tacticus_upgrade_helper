import Nav from "../components/Nav";
import AbilityTable from "./AbilityTable";
import { getReport } from "../lib/report";
import { getCharacterCatalog, getAbilityBreakpoints } from "../lib/catalog";
import { abilityActionQueue, abilityGuideRows, abilityLongTermGoals } from "../../src/domain/abilities";
import CharacterName from "../components/CharacterName";
import { campaignIsComplete, requiredCampaignName, type CampaignBattleDefinition } from "../../src/domain/campaigns";
import { readFile } from "node:fs/promises";

export default async function Abilities()
{

    const [report, catalog, guidance, priorities, battleText, raidMetaText, communityText] = await Promise.all([getReport(), getCharacterCatalog(), getAbilityBreakpoints(), readFile("config/character_priorities.json", "utf8"), readFile("data/game/campaign-battles.json", "utf8"), readFile("config/raid_boss_meta.json", "utf8"), readFile("config/community_character_priorities.json", "utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your owned characters.</div></main>;
    const accountPriorities=JSON.parse(priorities) as Record<string,{priority:number;modes?:string[]}>;
    const rows=abilityGuideRows(catalog.characters,report.roster,guidance,accountPriorities).filter(row=>row.owned);
    const community=JSON.parse(communityText) as {characters:Array<{name:string;score:number;teams:string[]}>};
    const communityPriorities=Object.fromEntries(community.characters.map(character=>[character.name,character]));
    const directQueue=abilityActionQueue(rows,accountPriorities,communityPriorities).slice(0,10);
    const longTermGoals=abilityLongTermGoals(rows,accountPriorities,communityPriorities).slice(0,10);
    const battleCatalog=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
    const incompleteCampaigns=new Set((report.campaignProgress??[]).filter(campaign=>!campaignIsComplete(campaign,battleCatalog)).map(requiredCampaignName));
    const campaignGroups=[...incompleteCampaigns].sort().map(name=>({name,characterIds:catalog.characters.filter(character=>character.campaignsRequiredIn.includes(name)).map(character=>character.id)})).filter(group=>group.characterIds.length);
    const reviewed=rows.filter(row=>row.reviewed).length;
    return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Your Ability Upgrade Plan</h1><p className="sub">Only your owned characters are shown. Character-specific community targets override the general planning ladder.</p><p className="sub">Account report: {report.generatedAt}</p></div><div className="power">{reviewed}/{rows.length}<strong> character-specific</strong></div></header>
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">UPGRADE NOW</p><h2>Ability upgrades you can do now</h2><p className="sub">These next badge levels are already unlocked by the character&apos;s XP level. The long-term target stays visible so each immediate upgrade has a purpose.</p></div><div className="power">{directQueue.length}<strong>next upgrades</strong></div></div><div className="tableWrap"><table><thead><tr><th>Character</th><th>Upgrade next</th><th>Next level → long-term target</th><th>Why now</th></tr></thead><tbody>{directQueue.length?directQueue.map((row,index)=><tr key={row.id+row.next.ability}><td><small>#{index+1}</small><CharacterName name={row.character} id={row.id} icon={row.icon}/></td><td><strong>{row.next.ability}: {row.next.name}</strong><small>{row.next.weight>=5?"Ability-specific priority":"Practical target gap"}</small></td><td className="below">{row.next.level??"UNKNOWN"} → {(row.next.level??0)+1}<small>Long-term goal: {row.next.target} · {Math.max(0,row.next.target-(row.next.level??row.next.target))} levels remaining</small></td><td>{row.communityScore?`Community score ${row.communityScore.toFixed(2)}`:"Account/campaign priority"}<small>{row.communityTeams.join(" · ")||row.basis}</small></td></tr>):<tr><td colSpan={4}>No researched ability upgrades are currently unlocked. Use the long-term plan below to prepare the next ones.</td></tr>}</tbody></table></div></section>
        <section className="panel detailPanel"><div className="sectionTitle"><div><p className="eyebrow">BUILD TOWARD</p><h2>Targets blocked by character XP level</h2><p className="sub">These are valuable ability targets, but the character cannot reach them yet. Build XP, rank, equipment, and materials first; the badge plan becomes actionable at the listed level.</p></div><div className="power">{longTermGoals.length}<strong>long-term goals</strong></div></div><div className="tableWrap"><table><thead><tr><th>Character</th><th>Future ability goal</th><th>Character level needed</th><th>Why it matters</th></tr></thead><tbody>{longTermGoals.length?longTermGoals.map((row,index)=><tr key={row.id+row.next.ability}><td><small>#{index+1}</small><CharacterName name={row.character} id={row.id} icon={row.icon}/></td><td><strong>{row.next.ability}: {row.next.name}</strong><small>Target ability level: {row.next.target}</small></td><td className="below">XP {row.xpLevel} → {row.next.target}<small>{row.xpGap} character levels before this target is available</small></td><td>{row.communityScore?`Community score ${row.communityScore.toFixed(2)}`:"Account/campaign priority"}<small>{row.communityTeams.join(" · ")||row.basis}</small></td></tr>):<tr><td colSpan={4}>No researched ability targets are currently blocked by XP level.</td></tr>}</tbody></table></div></section>
        <section className="panel tablePanel"><AbilityTable rows={rows} campaignGroups={campaignGroups} raidMeta={JSON.parse(raidMetaText)}/></section>
    </main>;

}
