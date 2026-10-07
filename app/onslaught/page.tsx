import {readFile} from "node:fs/promises";
import Nav from "../components/Nav";
import {getReport} from "../lib/report";
import {getCharacterCatalog,getAbilityBreakpoints} from "../lib/catalog";
import {getUtilityRatings} from "../lib/utilityRatings";
import {abilityGuideRows} from "../../src/domain/abilities";
import {buildDistinctDefenseTeams,type DefenseCore} from "../../src/domain/warTeams";
import type {WarBadgeTeam} from "../../src/domain/warBadgeTargets";
import type {OnslaughtCandidate} from "../../src/domain/onslaught";
import HonorPriorities from "./HonorPriorities";

type WarSource={teams?:DefenseCore[];validatedFullLineups?:Array<{name:string;members:string[];used:number;wins:number}>};
type BattleRewards={rewards?:{potential?:Array<{id:string;effective_rate?:number;chance_numerator?:number}>}};

export default async function Onslaught() {
 const [report,catalog,guidance,defense,offense,battles]=await Promise.all([
  getReport(),getCharacterCatalog(),getAbilityBreakpoints(),
  readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<WarSource>,
  readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<WarSource>,
  readFile("data/game/campaign-battles.json","utf8").then(JSON.parse) as Promise<Record<string,BattleRewards>>
 ]);
 if(!report)return <main><Nav/><h1>Onslaught honor priorities</h1><div className="empty">Run <code>npm run refresh</code> to load your roster and resources.</div></main>;
 const ratings=new Map((await getUtilityRatings(report)).map(row=>[row.name,row]));
 const guides=new Map(abilityGuideRows(catalog.characters,report.roster,guidance,{}).map(row=>[row.id,row]));
 const shardSources=new Set(Object.values(battles).flatMap(battle=>battle.rewards?.potential?.filter(reward=>(reward.effective_rate??reward.chance_numerator??0)>0).map(reward=>reward.id)??[]));
 const candidates:OnslaughtCandidate[]=report.roster.flatMap(unit=>{
  const guide=guides.get(unit.id),utility=ratings.get(guide?.character??"");
  if(!guide||!utility)return [];
  return [{id:unit.id,name:guide.character,alliance:unit.grandAlliance,rank:unit.rank,progressionIndex:unit.progressionIndex,
   shards:Number.isSafeInteger(unit.shards)&&unit.shards>=0?unit.shards:null,
   mythicShards:Number.isSafeInteger(unit.mythicShards)&&unit.mythicShards>=0?unit.mythicShards:null,
   utility,campaignGoals:[],xpLevel:unit.xpLevel,activeLevel:guide.activeLevel,passiveLevel:guide.passiveLevel,
   activeTarget:guide.activeTargetLevel,passiveTarget:guide.passiveTargetLevel,targetsReviewed:guide.reviewed,
   campaignShardSource:shardSources.has(`shards_${unit.id}`)}];
 });
 const owned=new Set(report.roster.map(unit=>unit.name));
 const defenseTeams:WarBadgeTeam[]=buildDistinctDefenseTeams(defense.teams??[],owned).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const offenseTeams:WarBadgeTeam[]=(offense.validatedFullLineups??[]).filter(team=>team.members.every(name=>owned.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 return <main><Nav/><header><div><p className="eyebrow">HONOR YOUR WARRIORS</p><h1>Onslaught honor priorities</h1><p className="sub">Top three owned characters per alliance, based on your rarity goals, shard-ready orb needs and practical ability targets.</p></div></header>
  <HonorPriorities key={`${report.source.player}:${report.generatedAt}`} candidates={candidates} orbs={report.orbInventory??null} badges={report.abilityBadges??null} defenseTeams={defenseTeams} offenseTeams={offenseTeams} accountKey={report.source.player}/>
 </main>;
}
