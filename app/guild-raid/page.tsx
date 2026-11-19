import Nav from "../components/Nav";
import GuildRaidPlanner from "./GuildRaidPlanner";
import { getAbilityBreakpoints, getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";
import { raidCandidates } from "../../src/domain/raidLineup";
import { raidTargetBasis } from "../../src/domain/raidTargetBasis";
import { getMainRaidSelection, getRaidMeta, ownedRaidUnits } from "../lib/raidSelection";
import { activeRaidBoss } from "../../src/domain/raidBossActivity";
import { resolveRaidSelection } from "../../src/domain/raidSelection";
import { raidMythicNames } from "../../src/domain/raidMachine";

export default async function GuildRaid()
{

    const [report,catalog,meta,guidance]=await Promise.all([getReport(),getCharacterCatalog(),getRaidMeta(),getAbilityBreakpoints()]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const mainSelection=await getMainRaidSelection(meta.bosses,report);
    const detected=activeRaidBoss(report.raidBossActivity);
    const guildBoss=detected&&Object.hasOwn(meta.bosses,detected)?detected:null;
    const initialSelection=guildBoss&&guildBoss!==mainSelection.boss
        ?resolveRaidSelection({boss:guildBoss,teamName:Object.keys(meta.bosses[guildBoss]!)[0],flex:[],autoFlex:true},meta.bosses,ownedRaidUnits(report),raidMythicNames(report.roster))
        :mainSelection;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const teams=Object.fromEntries(Object.entries(meta.bosses).map(([boss,options])=>[boss,Object.fromEntries(Object.entries(options).map(([name,team])=>[name,{...team,members:raidCandidates(team).map(name=>{const unit=units.get(name);const target=guidance[name] as {active?:{practical?:string;modes?:string[]};passive?:{practical?:string;modes?:string[]};confidence?:string}|undefined;return {name,id:unit?.id??catalog.characters.find(character=>character.name===name)?.id??name,icon:unit?icons.get(unit.id):undefined,owned:!!unit,rarity:unit?.rarity??null,rank:unit?.rank??null,xpLevel:unit?.xpLevel??null,activeLevel:unit?.abilities[0]?.level??null,passiveLevel:unit?.abilities[1]?.level??null,activeTarget:target?.active?.practical??"Research needed",passiveTarget:target?.passive?.practical??"Research needed",activeBasis:raidTargetBasis(target?.active?.modes,target?.confidence),passiveBasis:raidTargetBasis(target?.passive?.modes,target?.confidence)};})}]))]));
    return <main><Nav/><header><div><p className="eyebrow">GUILD RAID</p><h1>Guild Raid</h1><p className="sub">Choose a boss, prepare your team, and follow the battle plan.</p></div></header><GuildRaidPlanner key={report.generatedAt} teams={teams} source={meta._meta} mainSelection={mainSelection} initialSelection={initialSelection} guildBoss={guildBoss} roster={report.roster} orbInventory={report.orbInventory}/></main>;

}
