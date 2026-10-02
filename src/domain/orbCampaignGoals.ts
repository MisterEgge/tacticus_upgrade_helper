import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition,type Campaign} from "./campaigns";
import {RANK_NAMES} from "./ranks";
import {targetLevel} from "./abilities";
import type {CampaignTargetFile} from "../../app/lib/catalog";
import type {OrbCandidate} from "./orbPlanner";

// Reuse the practical lower bound; ranges and '+' do not justify their highest possible stop.
const abilityFloor=(value:string|undefined):number|null=>value&&/^\d+(?:\+|-\d+)?$/.test(value)?targetLevel(value):null;
export function campaignOrbGoals(name:string,targets:CampaignTargetFile,progress:Array<Pick<Campaign,"name"|"type"> & {highestCompletedBattle?:number|null}>|undefined,battles:CampaignBattleDefinition[]):OrbCandidate["campaignGoals"]{
 return Object.entries(targets.campaigns).flatMap(([campaignName,campaign])=>{
  const target=campaign.characters[name];
  if(!target||target.confidence==="low")return [];
  const current=progress?.find(row=>(row.type==="Elite"||row.type==="EliteMirror")&&requiredCampaignName(row)===campaignName);
  if(campaignIsComplete(current,battles))return [];
  const rank=RANK_NAMES.indexOf(target.rank as typeof RANK_NAMES[number]);
  const abilities=[abilityFloor(target.active),abilityFloor(target.passive)].filter((level):level is number=>level!==null);
  if(rank<0&&!abilities.length)return [];
  return [{campaign:campaignName,rank:rank<0?null:rank,ability:abilities.length?Math.max(...abilities):null,progressKnown:!!current}];
 });
}
