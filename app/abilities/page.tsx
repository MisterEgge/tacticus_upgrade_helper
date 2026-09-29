import Nav from"../components/Nav";
import{getAbilityBreakpoints,getCharacterCatalog}from"../lib/catalog";
import{getReport}from"../lib/report";
import{abilityGuideRows}from"../../src/domain/abilities";
import AbilityBadgeBudget from"./AbilityBadgeBudget";
import {readFile} from"node:fs/promises";
import {getMainRaidSelection,getRaidMeta} from"../lib/raidSelection";
import type {WarBadgeTeam} from"../../src/domain/warBadgeTargets";

export default async function Abilities()
{
 const[report,catalog,guidance,community,priorities,raidMeta,defensePlan,offensePlan]=await Promise.all([getReport(),getCharacterCatalog(),getAbilityBreakpoints(),readFile("config/community_character_priorities.json","utf8").then(JSON.parse) as Promise<{characters:Array<{name:string;score:number}>}>,readFile("config/character_priorities.json","utf8").then(JSON.parse) as Promise<Record<string,{priority:number}>>,getRaidMeta(),readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<{validatedFullLineups?:Array<{name:string;members:string[];used:number;wins:number}>}>,readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<{validatedFullLineups?:Array<{name:string;members:string[];used:number;wins:number}>}>]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const selection=await getMainRaidSelection(raidMeta.bosses,report);
 const raidTeam=raidMeta.bosses[selection.boss]?.[selection.teamName];
 const mainRaid=new Set([...(raidTeam?.core??[]),...selection.flex]);
 const scores=new Map(community.characters.map(character=>[character.name,character.score]));
 const roster=new Map(report.roster.map(unit=>[unit.id,unit]));
 const rows=abilityGuideRows(catalog.characters,report.roster,guidance,priorities).filter(row=>row.owned).map(row=>{const unit=roster.get(row.id)!;return {id:row.id,name:row.character,alliance:unit.grandAlliance,rank:unit.rank,rarity:unit.rarity,xpLevel:unit.xpLevel,activeLevel:row.activeLevel,passiveLevel:row.passiveLevel,activeTarget:row.activeTargetLevel,passiveTarget:row.passiveTargetLevel,reviewed:row.reviewed,recommended:row.recommended,communityScore:scores.get(row.character)??null,accountPriority:row.accountPriority,mainRaid:mainRaid.has(row.character)};});
 const ownedNames=new Set(report.roster.map(unit=>unit.name));
 const buildWarTeams=(plan:typeof defensePlan):WarBadgeTeam[]=>(plan.validatedFullLineups??[]).filter(team=>team.members.every(name=>ownedNames.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Badge Budget</h1><p className="sub">Plan badge needs for useful owned characters or your selected Guild War teams, grouped by alliance.</p></div></header><section className="panel detailPanel"><AbilityBadgeBudget rows={rows} defenseTeams={buildWarTeams(defensePlan)} offenseTeams={buildWarTeams(offensePlan)}/></section></main>;
}
