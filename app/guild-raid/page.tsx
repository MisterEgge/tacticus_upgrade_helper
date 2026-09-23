import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import GuildRaidPlanner from "./GuildRaidPlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";

type RaidMeta={_meta:{sourceUrl:string;reviewedOn:string;note:string};bosses:Record<string,Record<string,{core:string[];flex:string[]}>>};

export default async function GuildRaid()
{

    const [report,catalog,metaText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/raid_boss_meta.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const meta=JSON.parse(metaText) as RaidMeta;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const teams=Object.fromEntries(Object.entries(meta.bosses).map(([boss,options])=>[boss,Object.fromEntries(Object.entries(options).map(([name,team])=>[name,{...team,members:[...team.core,...team.flex].map(name=>{const unit=units.get(name);return {name,id:unit?.id??catalog.characters.find(character=>character.name===name)?.id??name,icon:unit?icons.get(unit.id):undefined,owned:!!unit,rank:unit?.rank??null,xpLevel:unit?.xpLevel??null,activeLevel:unit?.abilities[0]?.level??null,passiveLevel:unit?.abilities[1]?.level??null};})}]))]));
    return <main><Nav/><header><div><p className="eyebrow">GUILD RAID</p><h1>Choose a raid plan</h1><p className="sub">Pick the boss, then a sourced meta team and its exact flex options. Nothing is silently filled in or treated as owned.</p></div><div className="power">{Object.keys(meta.bosses).length}<strong> bosses covered</strong></div></header><GuildRaidPlanner teams={teams} source={meta._meta}/></main>;

}
