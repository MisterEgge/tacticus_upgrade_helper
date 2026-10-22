import {campaignIsComplete,campaignKey,type CampaignBattleDefinition} from "./campaigns";
const requiredName=(campaign:{name:string;type:string})=>campaignKey(campaign.name,campaign.type).replace(/ Elite$/,"");

/** Every known variant must be completed; an absent Elite export is not completion. */
export function campaignGearProtection(characters:Array<{name:string;campaignsRequiredIn:string[]}>,progress:Array<{name:string;type:string;highestCompletedBattle?:number|null}>,battles:CampaignBattleDefinition[]){
 const campaignNames:string[]=[],campaignUnknown:string[]=[];
 const variants=new Map<string,Set<string>>();
 for(const battle of battles){
  const name=requiredName({name:battle.campaign,type:battle.campaignType});
  const keys=variants.get(name)??new Set<string>();keys.add(campaignKey(battle.campaign,battle.campaignType));variants.set(name,keys);
 }
 for(const character of characters)for(const name of character.campaignsRequiredIn){
  const keys=variants.get(name);
  const matching=progress.filter(campaign=>requiredName(campaign)===name);
  if(!keys?.size||[...keys].some(key=>!matching.some(campaign=>campaignKey(campaign.name,campaign.type)===key)))campaignUnknown.push(character.name);
  if(matching.some(campaign=>!campaignIsComplete(campaign,battles)))campaignNames.push(character.name);
 }
 return {campaignNames:[...new Set(campaignNames)],campaignUnknown:[...new Set(campaignUnknown)]};
}
