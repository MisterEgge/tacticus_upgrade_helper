import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import WarDefensePlanner from "./WarDefensePlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";

type SourceTeam={name:string;core:string[];flex:Array<{name:string;used:number;win?:number}>;used:number;wins:number;defense?:number;score?:number};
type FullLineup={name:string;members:string[];used:number;wins:number;defense?:number;win?:number;score:number};type Plan={teams:SourceTeam[];validatedFullLineups?:FullLineup[]};

export default async function WarDefense()
{

    const [report,catalog,defenseText,offenseText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_defense_teams.json","utf8"),readFile("config/war_offense_teams.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const defensePlan=JSON.parse(defenseText)as Plan;
    const build=(team:SourceTeam,mode:"defense"|"offense",validated:FullLineup[]=[])=>{if(!team.core.every(name=>units.has(name)))return null;const flex=team.flex.filter(candidate=>units.has(candidate.name)&&!team.core.includes(candidate.name)).sort((a,b)=>b.used-a.used).slice(0,2);if(flex.length<2)return null;const names=[...team.core,...flex.map(candidate=>candidate.name)];const full=validated.find(lineup=>lineup.members.length===names.length&&lineup.members.every(name=>names.includes(name)));return {name:team.name,used:team.used,wins:team.wins,defense:team.defense,score:team.score,mode,fullLineup:full,members:names.map(name=>{const unit=units.get(name)!;const candidate=team.flex.find(flex=>flex.name===name);return {id:unit.id,name,icon:icons.get(unit.id),rank:unit.rank,activeLevel:unit.abilities[0]?.level??null,passiveLevel:unit.abilities[1]?.level??null,items:unit.items??[],flexUsed:candidate?.used,flexWin:candidate?.win};})};};
    const defense=defensePlan.teams.map(team=>build(team,"defense",defensePlan.validatedFullLineups)).filter((team):team is NonNullable<typeof team>=>!!team);
    const offense=(JSON.parse(offenseText)as Plan).teams.map(team=>build(team,"offense")).filter((team):team is NonNullable<typeof team>=>!!team);
    return <main><Nav/><header><div><p className="eyebrow">GUILD WAR</p><h1>Guild War team options</h1><p className="sub">Choose Defense or Offense first. Every option is source-backed and roster-aware; teams remain alternatives until you commit them to a lineup slot.</p></div><div className="power">{defense.length + offense.length}<strong> owned options</strong></div></header><WarDefensePlanner teams={defense} offenseTeams={offense}/></main>;

}
