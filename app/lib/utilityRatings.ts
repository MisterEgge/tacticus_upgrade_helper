import { selectedRaidNames } from "../../src/domain/raidSelection";
import {readFile} from "node:fs/promises";
import {getCharacterCatalog,getCampaignTargets} from "./catalog";
import {getMainRaidSelection,getRaidMeta} from "./raidSelection";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition} from "../../src/domain/campaigns";
import {rateCharacter} from "../../src/domain/characterUtility";
import type {Report} from "./report";

type WarPlan={validatedFullLineups?:Array<{members:string[]}>};

export async function getUtilityRatings(report:Report)
{
    const[catalog,community,priorities,raidMeta,defense,offense,targets,battleText]=await Promise.all([
        getCharacterCatalog(),
        readFile("config/community_character_priorities.json","utf8").then(JSON.parse) as Promise<{characters:Array<{name:string;score:number}>}>,
        readFile("config/character_priorities.json","utf8").then(JSON.parse) as Promise<Record<string,{priority:number}>>,
        getRaidMeta(),
        readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<WarPlan>,
        readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<WarPlan>,
        getCampaignTargets(),readFile("data/game/campaign-battles.json","utf8")
    ]);
    const selection=await getMainRaidSelection(raidMeta.bosses,report);
    const main=raidMeta.bosses[selection.boss]?.[selection.teamName];
    const scores=new Map(community.characters.map(row=>[row.name,row.score]));
    const raidTeams=Object.values(raidMeta.bosses).flatMap(boss=>Object.values(boss));
    const raidCore=new Set(raidTeams.flatMap(team=>team.core));
    const raidFlex=new Set(raidTeams.flatMap(team=>team.flex));
    const owned=new Set(report.roster.map(unit=>unit.name));
    const warOption=new Set([...(defense.validatedFullLineups??[]),...(offense.validatedFullLineups??[])].filter(team=>team.members.every(name=>owned.has(name))).flatMap(team=>team.members));
    const battleCatalog=Object.values(JSON.parse(battleText) as Record<string,CampaignBattleDefinition>);
    const unfinished=new Set(Object.keys(targets.campaigns).filter(name=>{
        const progress=report.campaignProgress?.find(c=>(c.type==="Elite"||c.type==="EliteMirror")&&requiredCampaignName(c)===name);
        return !campaignIsComplete(progress,battleCatalog);
    }));
    return catalog.characters.map(character=>rateCharacter({
        name:character.name,communityScore:scores.get(character.name)??null,accountPriority:priorities[character.name]?.priority??0,
        mainRaidCore:!!main && selectedRaidNames(selection,main).includes(character.name) && main.core.includes(character.name),mainRaidFlex:!!main && selectedRaidNames(selection,main).includes(character.name) && !main.core.includes(character.name),
        raidCore:raidCore.has(character.name),raidFlex:raidFlex.has(character.name),warOption:warOption.has(character.name),
        incompleteCampaign:character.campaignsRequiredIn.some(name=>unfinished.has(name))
    }));
}
