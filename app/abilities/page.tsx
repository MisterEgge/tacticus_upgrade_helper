import Nav from"../components/Nav";
import{getAbilityBreakpoints,getCharacterCatalog}from"../lib/catalog";
import{getReport}from"../lib/report";
import{abilityGuideRows}from"../../src/domain/abilities";
import AbilityBadgeBudget from"./AbilityBadgeBudget";
import {readFile} from"node:fs/promises";
import {getUtilityRatings} from"../lib/utilityRatings";
import type {WarBadgeTeam} from"../../src/domain/warBadgeTargets";
import {buildDistinctDefenseTeams,type DefenseCore} from"../../src/domain/warTeams";

export default async function Abilities()
{
 const[report,catalog,guidance,defensePlan,offensePlan]=await Promise.all([getReport(),getCharacterCatalog(),getAbilityBreakpoints(),readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<{teams?:DefenseCore[];validatedFullLineups?:Array<{name:string;members:string[];used:number;wins:number}>}>,readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<{validatedFullLineups?:Array<{name:string;members:string[];used:number;wins:number}>}>]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const ratings=new Map((await getUtilityRatings(report)).map(row=>[row.name,row]));
 const roster=new Map(report.roster.map(unit=>[unit.id,unit]));
 const rows=abilityGuideRows(catalog.characters,report.roster,guidance,{}).filter(row=>row.owned).map(row=>{const unit=roster.get(row.id)!,rating=ratings.get(row.character)!;return {id:row.id,name:row.character,alliance:unit.grandAlliance,rank:unit.rank,rarity:unit.rarity,xpLevel:unit.xpLevel,activeLevel:row.activeLevel,passiveLevel:row.passiveLevel,activeTarget:row.activeTargetLevel,passiveTarget:row.passiveTargetLevel,reviewed:row.reviewed,recommended:row.recommended,communityScore:rating.communityScore,accountPriority:rating.accountPriority,mainRaid:rating.mainRaidCore||rating.mainRaidFlex,utilityTier:rating.tier,utilitySignals:rating.signals};});
 const ownedNames=new Set(report.roster.map(unit=>unit.name));
 const buildWarTeams=(plan:typeof defensePlan):WarBadgeTeam[]=>(plan.validatedFullLineups??[]).filter(team=>team.members.every(name=>ownedNames.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const defenseTeams=buildDistinctDefenseTeams(defensePlan.teams??[],ownedNames).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Badge Budget</h1><p className="sub">Compare owned badges with the needs and shortfall for useful characters or your selected Guild War teams.</p></div></header><section className="panel detailPanel"><AbilityBadgeBudget rows={rows} badgeInventory={report.abilityBadges} defenseTeams={defenseTeams} offenseTeams={buildWarTeams(offensePlan)}/></section></main>;
}
