import Nav from "../components/Nav";
import GuildRaidPlanner from "./GuildRaidPlanner";
import { getAbilityBreakpoints, getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";
import { raidTargetBasis } from "../../src/domain/raidTargetBasis";
import { getMainRaidSelection, getRaidMeta } from "../lib/raidSelection";

export default async function GuildRaid()
{

    const [report,catalog,meta,guidance]=await Promise.all([getReport(),getCharacterCatalog(),getRaidMeta(),getAbilityBreakpoints()]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const mainSelection=await getMainRaidSelection(meta.bosses,report);
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const teams=Object.fromEntries(Object.entries(meta.bosses).map(([boss,options])=>[boss,Object.fromEntries(Object.entries(options).map(([name,team])=>[name,{...team,members:[...team.core,...team.flex].map(name=>{const unit=units.get(name);const target=guidance[name] as {active?:{practical?:string;modes?:string[]};passive?:{practical?:string;modes?:string[]};confidence?:string}|undefined;return {name,id:unit?.id??catalog.characters.find(character=>character.name===name)?.id??name,icon:unit?icons.get(unit.id):undefined,owned:!!unit,rarity:unit?.rarity??null,rank:unit?.rank??null,xpLevel:unit?.xpLevel??null,activeLevel:unit?.abilities[0]?.level??null,passiveLevel:unit?.abilities[1]?.level??null,activeTarget:target?.active?.practical??"Research needed",passiveTarget:target?.passive?.practical??"Research needed",activeBasis:raidTargetBasis(target?.active?.modes,target?.confidence),passiveBasis:raidTargetBasis(target?.passive?.modes,target?.confidence)};})}]))]));
    return <main><Nav/><header><div><p className="eyebrow">GUILD RAID</p><h1>Choose a raid plan</h1><p className="sub">Choose your boss and lineup, then save it as your main raid team.</p></div></header><GuildRaidPlanner key={report.generatedAt+JSON.stringify(mainSelection)} teams={teams} source={meta._meta} mainSelection={mainSelection} roster={report.roster}/></main>;

}
