import { campaignKey, campaignProgress, type Campaign } from "../../src/domain/campaigns";
import fs from "node:fs/promises";import path from "node:path";
export { farmNodesFor, bestFarmNode } from "../../src/domain/farmingSources";
export type { FarmNode, Progress } from "../../src/domain/farmingSources";
import type { CampaignBattle as Battle, Progress } from "../../src/domain/farmingSources";
import { RANK_NAMES } from "../../src/domain/farming";
import type { Recipe, RankData } from "../../src/domain/farming";
export { expandMaterial, planMaterials, rankMaterials, RANK_NAMES } from "../../src/domain/farming";
export type { Recipe, RankData } from "../../src/domain/farming";
export type ApiCampaign=Omit<Campaign,"id">;
export async function loadFarmingData(){try{const[b,r,u]=await Promise.all([fs.readFile(path.join(process.cwd(),"data/game/campaign-battles.json"),"utf8"),fs.readFile(path.join(process.cwd(),"data/game/upgrade-recipes.json"),"utf8"),fs.readFile(path.join(process.cwd(),"data/game/rank-up-data.json"),"utf8")]);return{battles:JSON.parse(b)as Record<string,Battle>,recipes:JSON.parse(r)as Record<string,Recipe>,rankData:JSON.parse(u)as RankData};}catch{return null;}}
export function progressFromReport(campaigns:Array<{name:string;type:string;highestUnlockedBattle:number|null}>):Progress{const out:Progress={};for(const c of campaigns){if(c.highestUnlockedBattle !== null)out[campaignKey(c.name,c.type)]=c.highestUnlockedBattle;}return out;}
export function progressFromApi(campaigns:ApiCampaign[]):Progress{const out:Progress={};for(const c of campaigns){const p=campaignProgress({...c,id:campaignKey(c.name,c.type)});if(p.highestUnlockedBattle!==null)out[campaignKey(c.name,c.type)]=p.highestUnlockedBattle;}return out;}
export function nextRankMaterials(unitId:string,currentRank:number,rankData:RankData){const key=RANK_NAMES[currentRank];return key?(rankData[unitId]?.[key]??[]):[];}
