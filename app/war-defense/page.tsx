import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import WarDefensePlanner from "./WarDefensePlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";
import { buildDistinctDefenseTeams, type DefenseCore } from "../../src/domain/warTeams";

type FullLineup={name:string;members:string[];used:number;wins:number;defense?:number;win?:number;score:number;evidence?:"core-flex"};type Plan={teams?:DefenseCore[];validatedFullLineups?:FullLineup[]};

export default async function WarDefense()
{

    const [report,catalog,defenseText,offenseText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_defense_teams.json","utf8"),readFile("config/war_offense_teams.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const build=(lineup:FullLineup)=>{const missing=lineup.members.filter(name=>!units.has(name));return {name:lineup.name,used:lineup.used,wins:lineup.wins,defense:lineup.defense,score:lineup.score,evidence:lineup.evidence,fieldable:missing.length===0,missing,members:lineup.members.map(name=>{const unit=units.get(name);return {id:unit?.id??`missing-${name}`,name,icon:unit?icons.get(unit.id):undefined,rank:unit?.rank??null,activeLevel:unit?.abilities[0]?.level??null,passiveLevel:unit?.abilities[1]?.level??null,items:unit?.items??[]};})};};
    const defensePlan=JSON.parse(defenseText)as Plan;
    const offensePlan=JSON.parse(offenseText)as Plan;
    const byWinRate=(a:ReturnType<typeof build>,b:ReturnType<typeof build>)=>b.wins/b.used-a.wins/a.used||b.used-a.used;
    const defense=buildDistinctDefenseTeams(defensePlan.teams??[],new Set(units.keys()),10).map(build);
    const offense=(offensePlan.validatedFullLineups??[]).map(build).filter(team=>team.fieldable).sort(byWinRate);
    return <main><Nav/><header><div><p className="eyebrow">GUILD WAR</p><h1>Guild War lineups</h1></div></header><WarDefensePlanner teams={defense} offenseTeams={offense}/></main>;

}
