import {getAccountWarDefense,warDefenseEvidence} from "../lib/warDefensePlan";
import {suggestGoldDefenseBuilds} from "../../src/domain/warDefenseEvidence";
import {RAID_MACHINES} from "../../src/domain/raidMachine";
import { readFile } from "node:fs/promises";
import Nav from "../components/Nav";
import WarDefensePlanner from "./WarDefensePlanner";
import { getCharacterCatalog } from "../lib/catalog";
import { getReport } from "../lib/report";
import { buildDistinctOffenseTeams, type OffenseCore } from "../../src/domain/warTeams";
import { getUtilityRatings } from "../lib/utilityRatings";
import { validateGuildWarCounterKnowledge, type GuildWarCounterKnowledge } from "../../src/domain/guildWarCounters";
import GuildWarCounterGuide from "./counters/GuildWarCounterGuide";
import { getShopCatalog } from "../lib/shops";
import { shopOffersForItem } from "../../src/domain/shops";

type FullLineup={name:string;members:string[];core?:string[];flex?:Array<{name?:string;id?:string;used:number;win?:number;wins?:number}>;used:number;wins:number;defense?:number;win?:number;score:number;evidence?:"core-flex"};type Plan={teams?:OffenseCore[];validatedFullLineups?:FullLineup[]};
type BattleRewards={rewards?:{potential?:Array<{id:string;effective_rate?:number;chance_numerator?:number}>}};
type UnlockTarget={id:string;name:string;icon?:string;evidence:"observed core"|"observed flex"|"exact five-character lineup";used:number;win:number;campaigns:string[];shops:Array<{shop:string;rotation:string;price:string}>};

export default async function WarDefense()
{

    const [report,catalog,offenseText,knowledgeText,shopCatalog,battleText]=await Promise.all([getReport(),getCharacterCatalog(),readFile("config/war_offense_teams.json","utf8"),readFile("config/guild_war_counters.json","utf8"),getShopCatalog(),readFile("data/game/campaign-battles.json","utf8")]);
    if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code> to load your roster.</div></main>;
    const units=new Map(report.roster.map(unit=>[unit.name,unit]));
    const icons=new Map(catalog.characters.map(character=>[character.id,character.icon]));
    const metadata=new Map(catalog.characters.map(character=>[character.id,character]));
    const memberFor=(name:string)=>{const unit=units.get(name)??report.roster.find(value=>value.id===name);return unit?{id:unit.id,name:unit.name,traits:metadata.get(unit.id)?.traits??[],faction:metadata.get(unit.id)?.faction??"",icon:icons.get(unit.id),rank:unit.rank,rarity:unit.rarity,progressionIndex:unit.progressionIndex,activeLevel:unit.abilities[0]?.level??null,passiveLevel:unit.abilities[1]?.level??null,items:unit.items}:undefined;};
    const build=(lineup:FullLineup)=>{const missing=lineup.members.filter(name=>!units.has(name));return {name:lineup.name,used:lineup.used,wins:lineup.wins,defense:lineup.defense,score:lineup.score,evidence:lineup.evidence,core:lineup.core??[],flex:(lineup.flex??[]).flatMap(candidate=>{const name=candidate.name??candidate.id;if(!name)return [];const member=memberFor(name);return member?[{name,used:candidate.used,win:candidate.win??((candidate.wins??0)/candidate.used*100),member}]:[];}).sort((a,b)=>b.win-a.win||b.used-a.used||a.name.localeCompare(b.name)),fieldable:missing.length===0,missing,members:lineup.members.map(name=>memberFor(name)??{id:`missing-${name}`,name,traits:[],faction:"",icon:undefined,rank:null,rarity:undefined,progressionIndex:undefined,activeLevel:null,passiveLevel:null,items:[]})};};
    const offensePlan=JSON.parse(offenseText)as Plan;
    const byWinRate=(a:ReturnType<typeof build>,b:ReturnType<typeof build>)=>b.wins/b.used-a.wins/a.used||b.used-a.used;
    const defense=getAccountWarDefense(report).map(lineup=>({...build({...lineup,score:lineup.confidence}),tier:lineup.tier,slot:lineup.slot,core:lineup.core,confidence:lineup.confidence}));
    const goldBuildSuggestions=suggestGoldDefenseBuilds(warDefenseEvidence.cores,report.roster,new Set(defense.flatMap(team=>team.members.map(member=>member.id))),2);
    const goldBuildTargets={
        teams:goldBuildSuggestions.teams.map(team=>({...team,members:team.members.flatMap(id=>memberFor(id)??[])})),
        characters:goldBuildSuggestions.characters.flatMap(target=>{const member=memberFor(target.id);return member?[{...target,member}]:[]})
    };
    const machines=RAID_MACHINES.flatMap(machine=>{const unit=report.roster.find(unit=>unit.id===machine.id);return unit?[{...machine,icon:icons.get(unit.id),rank:unit.rank,rarity:unit.rarity,progressionIndex:unit.progressionIndex,active:unit.abilities[0]?.level??0,passive:unit.abilities[1]?.level??0,activeLevel:unit.abilities[0]?.level??null,passiveLevel:unit.abilities[1]?.level??null,items:unit.items}]:[];});
    const offenseCores=buildDistinctOffenseTeams(offensePlan.teams??[],new Set(report.roster.map(unit=>unit.name))).map(build);
    const exactOffense=(offensePlan.validatedFullLineups??[]).map(lineup=>{
        return build({...lineup,core:lineup.members,flex:[]});
    }).filter(team=>team.fieldable);
    const offense=[...offenseCores,...exactOffense].sort(byWinRate);
    const knowledge=JSON.parse(knowledgeText) as GuildWarCounterKnowledge;
    validateGuildWarCounterKnowledge(catalog.characters,knowledge);
    const ratings=await getUtilityRatings(report);
    const communityScores=new Map(ratings.map(row=>[row.name,row.communityScore]));
    const assigned=new Set([...defense,...offense].flatMap(team=>team.members.map(member=>member.id)));
    const recommended=report.roster.filter(unit=>!assigned.has(unit.id)&&unit.rank>=9&&(communityScores.get(unit.name)??0)>=3).sort((a,b)=>(communityScores.get(b.name)??0)-(communityScores.get(a.name)??0)||b.rank-a.rank).map(unit=>({id:unit.id,name:unit.name,icon:icons.get(unit.id),rank:unit.rank,rarity:unit.rarity,progressionIndex:unit.progressionIndex,activeLevel:unit.abilities[0]?.level??null,passiveLevel:unit.abilities[1]?.level??null,items:unit.items,score:communityScores.get(unit.name)!}));
    const ownedNames=new Set(report.roster.map(unit=>unit.name));
    const unlockEvidence:Array<Omit<UnlockTarget,"id"|"campaigns"|"shops">>=[];
    for(const team of offensePlan.teams??[]){
        for(const name of team.core)unlockEvidence.push({name,evidence:"observed core",used:team.used,win:team.wins/team.used*100});
        for(const candidate of team.flex)unlockEvidence.push({name:candidate.name,evidence:"observed flex",used:candidate.used,win:candidate.win});
    }
    for(const lineup of offensePlan.validatedFullLineups??[])for(const name of lineup.members)unlockEvidence.push({name,evidence:"exact five-character lineup",used:lineup.used,win:lineup.win??lineup.wins/lineup.used*100});
    const bestUnlockEvidence=new Map<string,Omit<UnlockTarget,"id"|"campaigns"|"shops">>();
    for(const evidence of unlockEvidence){
        if(ownedNames.has(evidence.name))continue;
        const current=bestUnlockEvidence.get(evidence.name);
        if(!current||evidence.win>current.win||evidence.win===current.win&&evidence.used>current.used)bestUnlockEvidence.set(evidence.name,evidence);
    }
    const battles=JSON.parse(battleText) as Record<string,BattleRewards&{campaign?:string}>;
    const campaignSources=new Map<string,Set<string>>();
    for(const battle of Object.values(battles))for(const reward of battle.rewards?.potential??[]){
        if(!reward.id.startsWith("shards_")||(reward.effective_rate??reward.chance_numerator??0)<=0)continue;
        const id=reward.id.slice("shards_".length),sources=campaignSources.get(id)??new Set<string>();
        if(battle.campaign)sources.add(battle.campaign);
        campaignSources.set(id,sources);
    }
    const unlockTargets:UnlockTarget[]=[...bestUnlockEvidence].flatMap(([name,evidence])=>{
        const character=catalog.characters.find(value=>value.name===name);
        if(!character)return [];
        const shops=shopCatalog?shopOffersForItem(`shards_${character.id}`,shopCatalog).map(offer=>({shop:offer.shop,rotation:offer.rotation,price:offer.price})):[];
        return [{id:character.id,icon:character.icon,...evidence,campaigns:[...(campaignSources.get(character.id)??[])].sort(),shops}];
    }).sort((a,b)=>b.win-a.win||b.used-a.used||a.name.localeCompare(b.name));
    return <main><Nav/><header><div><p className="eyebrow">GUILD WAR</p><h1>Guild War lineups</h1><p className="sub">Plan your defense, offense, and counter picks.</p></div></header><WarDefensePlanner teams={defense} offenseTeams={offense} machines={machines} recommendedUnits={recommended} unlockTargets={unlockTargets} goldBuildTargets={goldBuildTargets} defenseSource={{scope:warDefenseEvidence.scope,metric:warDefenseEvidence.metric,importedAt:warDefenseEvidence.importedAt}} counterGuide={<GuildWarCounterGuide characters={catalog.characters} knowledge={knowledge}/>}/></main>;

}
