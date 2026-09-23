import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import WarDefensePlanner from "./WarDefensePlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";

type SourceTeam={name:string;core:string[]};
type FullLineup={name:string;members:string[];used:number;wins:number;defense?:number;win?:number;score:number};type Plan={teams?:SourceTeam[];validatedFullLineups?:FullLineup[]};

export default async function WarDefense()
{

    const [report,catalog,defenseText,offenseText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_defense_teams.json","utf8"),readFile("config/war_offense_teams.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const build=(lineup:FullLineup,pattern:SourceTeam)=>{if(!lineup.members.every(name=>units.has(name)))return null;return {name:`${pattern.name} · ${lineup.name.split(" · ").at(-1)??"full lineup"}`,used:lineup.used,wins:lineup.wins,defense:lineup.defense,score:lineup.score,fullLineup:lineup,members:lineup.members.map(name=>{const unit=units.get(name)!;return {id:unit.id,name,icon:icons.get(unit.id),rank:unit.rank,activeLevel:unit.abilities[0]?.level??null,passiveLevel:unit.abilities[1]?.level??null,items:unit.items??[]};})};};
    const defensePlan=JSON.parse(defenseText)as Plan;
    const offensePlan=JSON.parse(offenseText)as Plan;
    const verified=(plan:Plan)=>(plan.teams??[]).flatMap(pattern=>(plan.validatedFullLineups??[]).filter(lineup=>pattern.core.every(name=>lineup.members.includes(name))).map(lineup=>build(lineup,pattern)).filter((team):team is NonNullable<typeof team>=>!!team));
    const defense=verified(defensePlan);
    const offense=verified(offensePlan);
    return <main><Nav/><header><div><p className="eyebrow">GUILD WAR</p><h1>Guild War team options</h1><p className="sub">Every option starts with a supplied three-character core and is then cross-checked against an exact, fully owned five-character lineup. Cores without a matching five are not offered as teams.</p></div><div className="power">{defense.length + offense.length}<strong> verified owned options</strong></div></header><WarDefensePlanner teams={defense} offenseTeams={offense}/></main>;

}
