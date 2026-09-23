import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import WarDefensePlanner from "./WarDefensePlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";

type FullLineup={name:string;members:string[];used:number;wins:number;defense?:number;win?:number;score:number};type Plan={validatedFullLineups?:FullLineup[]};

export default async function WarDefense()
{

    const [report,catalog,defenseText,offenseText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_defense_teams.json","utf8"),readFile("config/war_offense_teams.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const build=(lineup:FullLineup)=>{const missing=lineup.members.filter(name=>!units.has(name));return {name:lineup.name,used:lineup.used,wins:lineup.wins,defense:lineup.defense,score:lineup.score,fieldable:missing.length===0,missing,members:lineup.members.map(name=>{const unit=units.get(name);return {id:unit?.id??`missing-${name}`,name,icon:unit?icons.get(unit.id):undefined,rank:unit?.rank??null,activeLevel:unit?.abilities[0]?.level??null,passiveLevel:unit?.abilities[1]?.level??null,items:unit?.items??[]};})};};
    const defensePlan=JSON.parse(defenseText)as Plan;
    const offensePlan=JSON.parse(offenseText)as Plan;
    const defense=(defensePlan.validatedFullLineups??[]).map(build);
    const offense=(offensePlan.validatedFullLineups??[]).map(build);
    return <main><Nav/><header><div><p className="eyebrow">GUILD WAR</p><h1>Guild War team options</h1><p className="sub">Every row is an exact five-character lineup from the supplied War source. Owned lineups are selectable; rows missing roster characters remain listed as can’t build, with the missing character named.</p></div><div className="power">{defense.filter(team=>team.fieldable).length}<strong> buildable defense options</strong></div></header><WarDefensePlanner teams={defense} offenseTeams={offense}/></main>;

}
