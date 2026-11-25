import { selectedRaidNames } from "../../src/domain/raidSelection";
import {readFile} from "node:fs/promises";
import {getCharacterCatalog} from "./catalog";
import {getMainRaidSelection,getRaidMeta} from "./raidSelection";
import {rateCharacter} from "../../src/domain/characterUtility";
import type {Report} from "./report";
import {getPlanningContext} from "./playerPriorities";

type WarPlan={validatedFullLineups?:Array<{members:string[]}>};

export async function getUtilityRatings(report:Report)
{
    const[catalog,community,priorities,raidMeta,defense,offense]=await Promise.all([
        getCharacterCatalog(),
        readFile("config/community_character_priorities.json","utf8").then(JSON.parse) as Promise<{characters:Array<{name:string;score:number;teams?:string[]}>}>,
        readFile("config/character_priorities.json","utf8").then(JSON.parse) as Promise<Record<string,{priority:number;note?:string;modes?:string[]}>>,
        getRaidMeta(),
        readFile("config/war_defense_teams.json","utf8").then(JSON.parse) as Promise<WarPlan>,
        readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<WarPlan>
    ]);
    const selection=await getMainRaidSelection(raidMeta.bosses,report);
    const main=raidMeta.bosses[selection.boss]?.[selection.teamName];
    const scores=new Map(community.characters.map(row=>[row.name,row.score]));
    const communityTeams=new Map(community.characters.map(row=>[row.name,row.teams]));
    const raidTeams=Object.values(raidMeta.bosses).flatMap(boss=>Object.values(boss));
    const raidCore=new Set(raidTeams.flatMap(team=>team.core));
    const raidFlex=new Set(raidTeams.flatMap(team=>team.flex));
    const owned=new Set(report.roster.map(unit=>unit.name));
    const warOption=new Set([...(defense.validatedFullLineups??[]),...(offense.validatedFullLineups??[])].filter(team=>team.members.every(name=>owned.has(name))).flatMap(team=>team.members));
    const planning=await getPlanningContext(report,catalog);
    return catalog.characters.map(character=>({...rateCharacter({
        name:character.name,communityScore:scores.get(character.name)??null,communityTeams:communityTeams.get(character.name)??[],accountPriority:priorities[character.name]?.priority??0,
        accountNote:priorities[character.name]?.note??null,priorityModes:priorities[character.name]?.modes??[],
        mainRaidCore:!!main && selectedRaidNames(selection,main).includes(character.name) && main.core.includes(character.name),mainRaidFlex:!!main && selectedRaidNames(selection,main).includes(character.name) && !main.core.includes(character.name),
        raidCore:raidCore.has(character.name),raidFlex:raidFlex.has(character.name),warOption:warOption.has(character.name),
        incompleteCampaign:planning.requiredCampaignNames.includes(character.name),
        campaignProgressUnknown:planning.requiredCampaignUnknown.includes(character.name),campaignHelper:planning.campaignHelperNames.includes(character.name)&&!planning.requiredCampaignNames.includes(character.name)&&!planning.requiredCampaignUnknown.includes(character.name)
    }),planningPriority:planning.scores[character.name]??0,planningModes:planning.preferences.modes,planningRoles:planning.roles[character.name]??[],pinned:planning.preferences.characters.includes(character.id)}));
}
