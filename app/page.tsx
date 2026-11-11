import Nav from "./components/Nav";
import DashboardUpgradeTabs from "./DashboardUpgradeTabs";
import {getReport} from "./lib/report";
import {getAccountActions} from "./lib/accountActions";
import {getCharacterCatalog,getAbilityBreakpoints} from "./lib/catalog";
import {getUtilityRatings} from "./lib/utilityRatings";
import {abilityGuideRows} from "../src/domain/abilities";
import {onslaughtPriorities} from "../src/domain/onslaught";
import {progressionRarity} from "../src/domain/characterProgression";
import {getAccountWarDefense} from "./lib/warDefensePlan";
import {warBadgeTargets,type WarBadgeTeam} from "../src/domain/warBadgeTargets";
import {rankAccountActions} from "../src/domain/dashboard";
import {readFile} from "node:fs/promises";

type WarSource={validatedFullLineups?:Array<{name:string;members:string[];used:number}>};
type BattleRewards={rewards?:{potential?:Array<{id:string;effective_rate?:number;chance_numerator?:number}>}};

export default async function Home(){
 const report=await getReport();
 if(!report)return <main><Nav/><div className="empty"><h2>No report yet</h2><p>Run <code>npm run refresh</code>, then reload.</p></div></main>;
 const [{rows,equipment},catalog,breakpoints,ratings,offenseText,battleText]=await Promise.all([
  getAccountActions(report),getCharacterCatalog(),getAbilityBreakpoints(),getUtilityRatings(report),
  readFile("config/war_offense_teams.json","utf8"),readFile("data/game/campaign-battles.json","utf8")
 ]);
 const ratingByName=new Map(ratings.map(row=>[row.name,row]));
 const nextRows=rankAccountActions(rows,new Set(equipment.raidNames)).slice(0,6);
 const owned=new Set(report.roster.map(unit=>unit.name));
 const defenseTeams:WarBadgeTeam[]=getAccountWarDefense(report).map(team=>({name:team.name,tier:team.tier,used:team.used,members:team.members.map(name=>({name}))}));
 const offensePlan=JSON.parse(offenseText) as WarSource;
 const offenseTeams:WarBadgeTeam[]=(offensePlan.validatedFullLineups??[]).filter(team=>team.members.every(name=>owned.has(name))).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const war=warBadgeTargets(defenseTeams,offenseTeams,null,"war-both");
 const guides=new Map(abilityGuideRows(catalog.characters,report.roster,breakpoints,{}).map(row=>[row.id,row]));
 const shardSources=new Set(Object.values(JSON.parse(battleText) as Record<string,BattleRewards>).flatMap(battle=>battle.rewards?.potential?.filter(reward=>(reward.effective_rate??reward.chance_numerator??0)>0).map(reward=>reward.id)??[]));
 const candidates=report.roster.flatMap(unit=>{
  const guide=guides.get(unit.id),utility=ratingByName.get(guide?.character??"");
  if(!guide||!utility)return [];
  return [{id:unit.id,name:guide.character,alliance:unit.grandAlliance,rank:unit.rank,progressionIndex:unit.progressionIndex,
   shards:Number.isSafeInteger(unit.shards)&&unit.shards>=0?unit.shards:null,
   mythicShards:Number.isSafeInteger(unit.mythicShards)&&unit.mythicShards>=0?unit.mythicShards:null,
   utility,campaignGoals:[],xpLevel:unit.xpLevel,activeLevel:guide.activeLevel,passiveLevel:guide.passiveLevel,
   activeTarget:guide.activeTargetLevel,passiveTarget:guide.passiveTargetLevel,targetsReviewed:guide.reviewed,
   campaignShardSource:shardSources.has(`shards_${unit.id}`)}];
 });
 const onslaughtTargets=onslaughtPriorities(candidates,report.orbInventory??null,report.abilityBadges??null,war,{},false)
  .flatMap(group=>group.rows).sort((a,b)=>a.priority-b.priority||a.relevance-b.relevance||a.name.localeCompare(b.name))
  .filter((target,index,all)=>all.findIndex(candidate=>candidate.id===target.id)===index).slice(0,6)
  .map(target=>({id:target.id,name:target.name,icon:catalog.characters.find(character=>character.id===target.id)?.icon,rarity:progressionRarity(target.progressionIndex)??"Unknown",reasons:target.reasons}));
 return <main><Nav/><header><div><p className="eyebrow">ACCOUNT OVERVIEW</p><h1>Dashboard</h1></div></header>
  <DashboardUpgradeTabs nextRows={nextRows} rows={rows} ratings={ratings} onslaughtTargets={onslaughtTargets}/>
 </main>;
}
