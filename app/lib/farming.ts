import { campaignKey, campaignProgress, type Campaign } from "../../src/domain/campaigns";
import fs from "node:fs/promises";import path from "node:path";
export type FarmNode={id:string;campaign:string;campaignType:string;nodeNumber:number;energyCost:number;rate:number;materialId:string;unlocked:boolean};
import { RANK_NAMES } from "../../src/domain/farming";
import type { Recipe, RankData } from "../../src/domain/farming";
export { expandMaterial, planMaterials, rankMaterials, RANK_NAMES } from "../../src/domain/farming";
export type { Recipe, RankData } from "../../src/domain/farming";
type Battle={campaign:string;campaignType:string;nodeNumber:number;energyCost:number;rewards?:{potential?:Array<{id:string;effective_rate?:number}>;guaranteed?:Array<{id:string;min?:number;max?:number}>}};
export type Progress=Record<string,number>;export type ApiCampaign=Omit<Campaign,"id">;
export async function loadFarmingData(){try{const[b,r,u]=await Promise.all([fs.readFile(path.join(process.cwd(),"data/game/campaign-battles.json"),"utf8"),fs.readFile(path.join(process.cwd(),"data/game/upgrade-recipes.json"),"utf8"),fs.readFile(path.join(process.cwd(),"data/game/rank-up-data.json"),"utf8")]);return{battles:JSON.parse(b)as Record<string,Battle>,recipes:JSON.parse(r)as Record<string,Recipe>,rankData:JSON.parse(u)as RankData};}catch{return null;}}
export function progressFromReport(campaigns:Array<{name:string;type:string;highestUnlockedBattle:number|null}>):Progress{const out:Progress={};for(const c of campaigns){if(c.highestUnlockedBattle !== null)out[campaignKey(c.name,c.type)]=c.highestUnlockedBattle;}return out;}
function progressKey(b:Battle){return campaignKey(b.campaign,b.campaignType);}
export function progressFromApi(campaigns:ApiCampaign[]):Progress{const out:Progress={};for(const c of campaigns){const p=campaignProgress({...c,id:campaignKey(c.name,c.type)});if(p.highestUnlockedBattle!==null)out[campaignKey(c.name,c.type)]=p.highestUnlockedBattle;}return out;}
function unlocked(b:Battle,p:Progress){const max=p[progressKey(b)];return max===undefined?false:Number.isInteger(b.nodeNumber)&&b.nodeNumber>0&&b.nodeNumber<=max;}
export function farmNodesFor(materialId:string,battles:Record<string,Battle>,progress:Progress):FarmNode[]{const out:FarmNode[]=[];for(const[id,b]of Object.entries(battles)){let rate=0;for(const reward of b.rewards?.guaranteed??[]){if(reward.id===materialId)rate+=(reward.min??1);}for(const reward of b.rewards?.potential??[]){if(reward.id===materialId)rate+=reward.effective_rate??0;}if(Number.isFinite(rate)&&rate>0&&Number.isFinite(b.energyCost)&&b.energyCost>0)out.push({id,campaign:b.campaign,campaignType:b.campaignType,nodeNumber:b.nodeNumber,energyCost:b.energyCost,rate,materialId,unlocked:unlocked(b,progress)});}return out.sort((a,b)=>Number(b.unlocked)-Number(a.unlocked)||(b.rate/b.energyCost)-(a.rate/a.energyCost));}
export function bestFarmNode(materialId:string,battles:Record<string,Battle>,progress:Progress){return farmNodesFor(materialId,battles,progress).find(x=>x.unlocked);}
export function nextRankMaterials(unitId:string,currentRank:number,rankData:RankData){const key=RANK_NAMES[currentRank];return key?(rankData[unitId]?.[key]??[]):[];}
