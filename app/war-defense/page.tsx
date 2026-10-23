import {getAccountWarDefense,warDefenseEvidence} from "../lib/warDefensePlan";
import {RAID_MACHINES} from "../../src/domain/raidMachine";
import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import WarDefensePlanner from "./WarDefensePlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";

type FullLineup={name:string;members:string[];used:number;wins:number;defense?:number;win?:number;score:number;evidence?:"core-flex"};type Plan={validatedFullLineups?:FullLineup[]};

export default async function WarDefense()
{

    const [report,catalog,offenseText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_offense_teams.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const metadata=new Map(catalog.characters.map(character=>[character.id,character]));
    const build=(lineup:FullLineup)=>{const missing=lineup.members.filter(name=>!units.has(name));return {name:lineup.name,used:lineup.used,wins:lineup.wins,defense:lineup.defense,score:lineup.score,evidence:lineup.evidence,fieldable:missing.length===0,missing,members:lineup.members.map(name=>{const unit=units.get(name);return {id:unit?.id??`missing-${name}`,name,traits:unit?metadata.get(unit.id)?.traits??[]:[],faction:unit?metadata.get(unit.id)?.faction??"":"",icon:unit?icons.get(unit.id):undefined,rank:unit?.rank??null,activeLevel:unit?.abilities[0]?.level??null,passiveLevel:unit?.abilities[1]?.level??null,items:unit?.items??[]};})};};
    const offensePlan=JSON.parse(offenseText)as Plan;
    const byWinRate=(a:ReturnType<typeof build>,b:ReturnType<typeof build>)=>b.wins/b.used-a.wins/a.used||b.used-a.used;
    const defense=getAccountWarDefense(report).map(lineup=>({...build({...lineup,score:lineup.confidence}),tier:lineup.tier,slot:lineup.slot,core:lineup.core,flex:lineup.flex,confidence:lineup.confidence}));
    const machines=RAID_MACHINES.flatMap(machine=>{const unit=report.roster.find(unit=>unit.id===machine.id);return unit?[{...machine,active:unit.abilities[0]?.level??0,passive:unit.abilities[1]?.level??0}]:[];});
    const offense=(offensePlan.validatedFullLineups??[]).map(build).filter(team=>team.fieldable).sort(byWinRate);
    return <main><Nav/><header><div><p className="eyebrow">GUILD WAR</p><h1>Guild War lineups</h1></div></header><WarDefensePlanner teams={defense} offenseTeams={offense} machines={machines} defenseSource={{scope:warDefenseEvidence.scope,metric:warDefenseEvidence.metric,importedAt:warDefenseEvidence.importedAt}}/></main>;

}
