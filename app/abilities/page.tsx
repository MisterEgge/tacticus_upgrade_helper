import Nav from"../components/Nav";
import{getAbilityBreakpoints,getCharacterCatalog}from"../lib/catalog";
import{getReport}from"../lib/report";
import{abilityGuideRows}from"../../src/domain/abilities";
import AbilityBadgeBudget from"./AbilityBadgeBudget";
import {readFile} from"node:fs/promises";
import {getMainRaidSelection,getRaidMeta} from"../lib/raidSelection";

export default async function Abilities()
{
 const[report,catalog,guidance,community,priorities,raidMeta]=await Promise.all([getReport(),getCharacterCatalog(),getAbilityBreakpoints(),readFile("config/community_character_priorities.json","utf8").then(JSON.parse) as Promise<{characters:Array<{name:string;score:number}>}>,readFile("config/character_priorities.json","utf8").then(JSON.parse) as Promise<Record<string,{priority:number}>>,getRaidMeta()]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const selection=await getMainRaidSelection(raidMeta.bosses,report);
 const raidTeam=raidMeta.bosses[selection.boss]?.[selection.teamName];
 const mainRaid=new Set([...(raidTeam?.core??[]),...selection.flex]);
 const scores=new Map(community.characters.map(character=>[character.name,character.score]));
 const roster=new Map(report.roster.map(unit=>[unit.id,unit]));
 const rows=abilityGuideRows(catalog.characters,report.roster,guidance,priorities).filter(row=>row.owned).map(row=>{const unit=roster.get(row.id)!;return {id:row.id,name:row.character,alliance:unit.grandAlliance,rank:unit.rank,rarity:unit.rarity,xpLevel:unit.xpLevel,activeLevel:row.activeLevel,passiveLevel:row.passiveLevel,activeTarget:row.activeTargetLevel,passiveTarget:row.passiveTargetLevel,reviewed:row.reviewed,recommended:row.recommended,communityScore:scores.get(row.character)??null,accountPriority:row.accountPriority,mainRaid:mainRaid.has(row.character)};});
 return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Badge Budget</h1><p className="sub">Plan badge needs for useful owned characters, grouped by alliance. Select a rank floor and ability tier to focus the budget.</p></div></header><section className="panel detailPanel"><AbilityBadgeBudget rows={rows}/></section></main>;
}
