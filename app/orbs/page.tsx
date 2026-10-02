import {readFile} from "node:fs/promises";
import Nav from "../components/Nav";
import OrbPlanner from "./OrbPlanner";
import {getReport} from "../lib/report";
import {getCharacterCatalog,getCampaignTargets} from "../lib/catalog";
import {getUtilityRatings} from "../lib/utilityRatings";
import type {CampaignBattleDefinition} from "../../src/domain/campaigns";
import {campaignOrbGoals} from "../../src/domain/orbCampaignGoals";
import {buildDistinctDefenseTeams,type DefenseCore} from "../../src/domain/warTeams";
import type {WarBadgeTeam} from "../../src/domain/warBadgeTargets";
import type {OrbCandidate} from "../../src/domain/orbPlanner";
import type {ShopCatalog} from "../../src/domain/shops";

type WarSource={teams?:DefenseCore[];validatedFullLineups?:Array<{name:string;members:string[];used:number;wins:number}>};
export default async function Orbs(){
 const [report,catalog,targets,battles,defense,offense,shops]=await Promise.all([getReport(),getCharacterCatalog(),getCampaignTargets(),readFile("data/game/campaign-battles.json","utf8").then(JSON.parse) as Promise<Record<string,CampaignBattleDefinition>>,readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<WarSource>,readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<WarSource>,readFile("data/game/shops.json","utf8").then(JSON.parse) as Promise<ShopCatalog>]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster and orb inventory.</div></main>;
 const ratings=new Map((await getUtilityRatings(report)).map(row=>[row.name,row]));
 const ids=new Set(catalog.characters.map(character=>character.id));
 const owned=new Set(report.roster.map(unit=>unit.name));
 const candidates:OrbCandidate[]=report.roster.filter(unit=>ids.has(unit.id)).map(unit=>({id:unit.id,name:unit.name,alliance:unit.grandAlliance,rank:unit.rank,progressionIndex:unit.progressionIndex,shards:Number.isSafeInteger(unit.shards)&&unit.shards>=0?unit.shards:null,mythicShards:Number.isSafeInteger(unit.mythicShards)&&unit.mythicShards>=0?unit.mythicShards:null,utility:ratings.get(unit.name)!,campaignGoals:campaignOrbGoals(unit.name,targets,report.campaignProgress,Object.values(battles))}));
 const defenseTeams:WarBadgeTeam[]=buildDistinctDefenseTeams(defense.teams??[],owned).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const offenseTeams:WarBadgeTeam[]=(offense.validatedFullLineups??[]).filter(team=>team.members.every(name=>owned.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 return <main><Nav/><header><div><p className="eyebrow">ASCENSION</p><h1>Orb priorities</h1><p className="sub">Who to upgrade next, which alliance and rarity to collect, and where to get them.</p></div></header><section className="panel detailPanel"><OrbPlanner key={report.generatedAt} candidates={candidates} inventory={report.orbInventory??null} defenseTeams={defenseTeams} offenseTeams={offenseTeams} shops={shops}/></section></main>;
}
