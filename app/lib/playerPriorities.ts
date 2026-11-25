import {cache} from "react";
import {cookies} from "next/headers";
import {readFile} from "node:fs/promises";
import {DEFAULT_PRIORITIES, parsePlayerPriorities, characterPlanningPriority, type PriorityMode} from "../../src/domain/playerPriorities";
import {getSupabasePublicConfig} from "../../src/server/supabaseConfig";
import {createSupabaseServerClient} from "./supabase/server";
import {getRaidMeta, getMainRaidSelection} from "./raidSelection";
import {selectedRaidNames} from "../../src/domain/raidSelection";
import {getWarLineups} from "./warLineups";
import {selectedWarGearGoals} from "../../src/domain/equipmentGoals";
import {campaignGearProtection,campaignHelperProtection} from "../../src/domain/campaignGearProtection";
import type {CampaignBattleDefinition} from "../../src/domain/campaigns";
import type {Report} from "./report";
import type {CatalogCharacter} from "./catalog";

export const PRIORITIES_COOKIE = "tacticus-player-priorities";
export const getPlayerPriorities = cache(async () => {
    if (getSupabasePublicConfig()) {
        const supabase = await createSupabaseServerClient();
        const {data: {user}, error} = await supabase.auth.getUser();
        if (!user) return {preferences: DEFAULT_PRIORITIES, configured: false, storage: "account" as const};
        if (error) throw new Error("Could not load account priorities. Try again.");
        const saved = parsePlayerPriorities(user?.user_metadata?.tacticus_priorities);
        return {preferences: saved ?? DEFAULT_PRIORITIES, configured: !!saved, storage: "account" as const};
    }
    const raw = (await cookies()).get(PRIORITIES_COOKIE)?.value;
    let value: unknown;
    try {value = raw ? JSON.parse(raw) : null;} catch {value = null;}
    const saved = parsePlayerPriorities(value);
    return {preferences: saved ?? DEFAULT_PRIORITIES, configured: !!saved, storage: "browser" as const};
});

export const getPlanningContext=cache(async (report: Report, catalog: {characters: CatalogCharacter[]}) => {
    const [settings, meta, war, battleText, focusText] = await Promise.all([
        getPlayerPriorities(), getRaidMeta(), getWarLineups(report, catalog), readFile("data/game/campaign-battles.json", "utf8"), readFile("config/character_priorities.json","utf8")
    ]);
    const selection = await getMainRaidSelection(meta.bosses, report);
    const team = meta.bosses[selection.boss]?.[selection.teamName];
    const raidNames = team ? [...selectedRaidNames(selection, team)] : [];
    if (selection.machine) raidNames.push(selection.machine);
    const warNames = new Set(selectedWarGearGoals(war.defense.map(team => ({name:team.name,used:team.used,tier:team.tier,slot:team.slot,members:team.members.map(name => ({name}))})), war.offense.map(team => ({name:team.name,used:team.used,members:team.members.map(name => ({name}))})), null).keys());
    const battles=Object.values(JSON.parse(battleText)) as CampaignBattleDefinition[];
    const campaigns = campaignGearProtection(catalog.characters, report.campaignProgress ?? [], battles);
    const helpers=campaignHelperProtection(catalog.characters,report.campaignProgress??[],battles,JSON.parse(focusText));
    // Unknown completion stays visible as a prerequisite; it is never treated as completed.
    const campaignNames = new Set([...campaigns.campaignNames, ...campaigns.campaignUnknown,...helpers.campaignNames,...helpers.campaignUnknown]);
    const scores: Record<string, number> = {};
    const roles: Record<string, PriorityMode[]> = {};
    for (const unit of report.roster) {
        roles[unit.name] = [...(campaignNames.has(unit.name) ? ["campaign" as const] : []), ...(raidNames.includes(unit.name) ? ["raid" as const] : []), ...(warNames.has(unit.name) ? ["war" as const] : [])];
        scores[unit.name] = characterPlanningPriority(settings.preferences, unit.id, roles[unit.name]!);
    }
    return {...settings, scores, roles,requiredCampaignNames:campaigns.campaignNames,requiredCampaignUnknown:campaigns.campaignUnknown,campaignHelperNames:[...new Set([...helpers.campaignNames,...helpers.campaignUnknown])]};
});
