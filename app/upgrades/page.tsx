import Link from "next/link";
import {readFile} from "node:fs/promises";
import Nav from "../components/Nav";
import {getReport} from "../lib/report";
import {getCharacterCatalog} from "../lib/catalog";
import {getWarLineups} from "../lib/warLineups";
import {warDefenseEvidence} from "../lib/warDefensePlan";
import {getPlayerPriorities} from "../lib/playerPriorities";
import type {OffenseCore} from "../../src/domain/warTeams";
import type {WarUpgradeSource} from "../../src/domain/warUpgrades";
import WarUpgradePlanner from "./WarUpgradePlanner";
import {uniqueWarTeamIndexes} from "../../src/domain/warTeams";

type OffenseEvidence={_meta:{reviewedOn:string};teams:OffenseCore[];validatedFullLineups:Array<{name:string;members:string[];used:number;wins:number}>};
export default async function Upgrades(){
    const [report,catalog,offense,preferences]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<OffenseEvidence>,getPlayerPriorities()]);
    if(!report)return <main><Nav/><header><h1>Character upgrades</h1></header><div className="empty">Sync Account to find War upgrades for your roster.</div></main>;
    const characters=new Map(catalog.characters.map(unit=>[unit.id,unit]));
    const roster=report.roster.filter(unit=>characters.has(unit.id)).map(({id,name,rank,rarity})=>({id,name,rank,rarity}));
    const aliases=new Map<string,string>();
    for(const unit of roster){
        const character=characters.get(unit.id)!;
        for(const value of [unit.id,unit.name,character.name,character.fullName,character.shortName])aliases.set(value,unit.id);
    }
    const resolve=(name:string)=>aliases.get(name)??`unowned:${name}`;
    const rate=(wins:number,used:number)=>used>0?wins/used*100:NaN;
    const sources:WarUpgradeSource[]=[
        ...warDefenseEvidence.cores.map(core=>({key:`defense:${core.key}`,side:"defense" as const,kind:"core" as const,core:core.core,used:core.used,rate:rate(core.wins,core.used),flex:core.flex.map(choice=>({id:choice.id,used:choice.used,rate:rate(choice.wins,choice.used)}))})),
        ...offense.teams.map(core=>({key:`offense:${core.name}`,side:"offense" as const,kind:"core" as const,core:core.core.map(resolve),used:core.used,rate:rate(core.wins,core.used),flex:core.flex.map(choice=>({id:resolve(choice.name),used:choice.used,rate:choice.win}))})),
        ...offense.validatedFullLineups.map(lineup=>({key:`exact:${lineup.name}`,side:"offense" as const,kind:"lineup" as const,core:lineup.members.map(resolve),used:lineup.used,rate:rate(lineup.wins,lineup.used),flex:[]}))
    ];
    const lineups=await getWarLineups(report,catalog);
    const selectedOffense=uniqueWarTeamIndexes(lineups.offense.map(team=>({...team,members:team.members.map(name=>({name}))})),10);
    const defaults={defense:lineups.defense.map(team=>team.members.map(resolve)),offense:selectedOffense.map(index=>lineups.offense[index]!.members.map(resolve)).filter(ids=>ids.length===5)};
    return <main><Nav/><header><div><p className="eyebrow">CHARACTER UPGRADES</p><h1>Build stronger War teams</h1><p className="sub">Rank upgrades that open source-backed lineups from characters you own.</p></div></header>
        {!preferences.preferences.modes.includes("war")?<p className="sub">War is off in your account priorities. These are optional upgrades. <Link href="/priorities">Update priorities</Link></p>:null}
        <WarUpgradePlanner defenseMetric={warDefenseEvidence.metric} roster={roster} sources={sources} defaults={defaults} reviewed={{defense:warDefenseEvidence.importedAt.slice(0,10),offense:offense._meta.reviewedOn}}/>
    </main>;
}
