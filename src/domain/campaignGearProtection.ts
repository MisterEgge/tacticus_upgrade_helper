import {campaignIsComplete,campaignKey,type CampaignBattleDefinition} from "./campaigns";
import rosters from "../../config/campaign_rosters.json";
const requiredName=(campaign:{name:string;type:string})=>campaignKey(campaign.name,campaign.type).replace(/ Elite$/,"");
type CampaignCharacter={name:string;campaignsRequiredIn:string[];faction?:string;alliance?:string};
const normalized=(value:string|undefined)=>(value??"").toLowerCase().replace(/[^a-z]/g,"").replace(/^imperium$/,"imperial");

/** Native-faction helpers share campaign priority; broader allies are protected
 * as possible donors without automatically creating investment goals for all of them. */
export function campaignRosterMemberships(character:CampaignCharacter,includeAllianceHelpers=false):string[]{
 const names=new Set(character.campaignsRequiredIn.map(name=>requiredName({name,type:"Standard"})));
 for(const [name,rule]of Object.entries(rosters.campaigns)){
  if(normalized(character.faction)===normalized(rule.faction)||includeAllianceHelpers&&"helperAlliance" in rule&&normalized(character.alliance)===normalized(rule.helperAlliance))names.add(name);
 }
 return [...names];
}

/** Every known variant must be completed; an absent Elite export is not completion. */
export function campaignGearProtection(characters:CampaignCharacter[],progress:Array<{name:string;type:string;highestCompletedBattle?:number|null}>,battles:CampaignBattleDefinition[],includeAllianceHelpers=false){
 const campaignNames:string[]=[],campaignUnknown:string[]=[];
 const variants=new Map<string,Set<string>>();
 for(const battle of battles){
  const name=requiredName({name:battle.campaign,type:battle.campaignType});
  const keys=variants.get(name)??new Set<string>();keys.add(campaignKey(battle.campaign,battle.campaignType));variants.set(name,keys);
 }
 for(const character of characters)for(const name of campaignRosterMemberships(character,includeAllianceHelpers)){
  const keys=variants.get(name);
  const matching=progress.filter(campaign=>requiredName(campaign)===name);
  if(!keys?.size||[...keys].some(key=>!matching.some(campaign=>campaignKey(campaign.name,campaign.type)===key)))campaignUnknown.push(character.name);
  if(matching.some(campaign=>!campaignIsComplete(campaign,battles)))campaignNames.push(character.name);
 }
 return {campaignNames:[...new Set(campaignNames)],campaignUnknown:[...new Set(campaignUnknown)]};
}
