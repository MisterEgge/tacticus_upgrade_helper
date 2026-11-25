import {campaignIsComplete,campaignKey,finalCampaignBattle,type CampaignBattleDefinition} from "./campaigns";
import rosters from "../../config/campaign_rosters.json";
const requiredName=(campaign:{name:string;type:string})=>campaignKey(campaign.name,campaign.type).replace(/ Elite$/,"");
type CampaignCharacter={name:string;campaignsRequiredIn:string[];faction?:string;alliance?:string};
const normalized=(value:string|undefined)=>(value??"").toLowerCase().replace(/[^a-z]/g,"").replace(/^imperium$/,"imperial");

/** Eligibility is not a requirement. Optional helpers need an explicit plan entry. */
export function campaignRosterMemberships(character:CampaignCharacter,selectedHelpers:ReadonlyMap<string,readonly string[]>=new Map()):string[]{
 const names=new Set(character.campaignsRequiredIn.map(name=>requiredName({name,type:"Standard"})));
 for(const [name,rule]of Object.entries(rosters.campaigns)){
  if(selectedHelpers.get(character.name)?.some(campaign=>requiredName({name:campaign,type:"Standard"})===name)&&(normalized(character.faction)===normalized(rule.faction)||"helperAlliance" in rule&&normalized(character.alliance)===normalized(rule.helperAlliance)))names.add(name);
 }
 return [...names];
}

/** Every known variant must be completed; an absent Elite export is not completion. */
function activeCampaignProtection(characters:CampaignCharacter[],progress:Array<{name:string;type:string;highestCompletedBattle?:number|null}>,battles:CampaignBattleDefinition[],selectedHelpers:ReadonlyMap<string,readonly string[]>=new Map()){
 const campaignNames:string[]=[],campaignUnknown:string[]=[];
 const variants=new Map<string,Set<string>>();
 for(const battle of battles){
  const name=requiredName({name:battle.campaign,type:battle.campaignType});
  const keys=variants.get(name)??new Set<string>();keys.add(campaignKey(battle.campaign,battle.campaignType));variants.set(name,keys);
 }
 for(const character of characters)for(const name of campaignRosterMemberships(character,selectedHelpers)){
  const keys=variants.get(name);
  const matching=progress.filter(campaign=>requiredName(campaign)===name);
  const known=matching.filter(campaign=>Number.isInteger(campaign.highestCompletedBattle)&&(campaign.highestCompletedBattle??-1)>=0&&finalCampaignBattle(campaign.name,campaign.type,battles)!==null);
  if(!keys?.size||[...keys].some(key=>!known.some(campaign=>campaignKey(campaign.name,campaign.type)===key)))campaignUnknown.push(character.name);
  if(known.some(campaign=>!campaignIsComplete(campaign,battles)))campaignNames.push(character.name);
 }
 return {campaignNames:[...new Set(campaignNames)],campaignUnknown:[...new Set(campaignUnknown)]};
}

/** Required membership comes only from verified mandatory catalog entries. */
export function campaignGearProtection(characters:CampaignCharacter[],progress:Parameters<typeof activeCampaignProtection>[1],battles:CampaignBattleDefinition[]){
 return activeCampaignProtection(characters,progress,battles);
}

/** An explicit campaign assignment selects a helper; generic Campaign focus does not. */
export function campaignHelperProtection(characters:CampaignCharacter[],progress:Parameters<typeof campaignGearProtection>[1],battles:CampaignBattleDefinition[],focus:Record<string,{campaignHelpersFor?:string[];modes?:string[]}>){
 const selected=new Map(Object.entries(focus).filter(([,entry])=>entry.campaignHelpersFor?.length).map(([name,entry])=>[name,entry.campaignHelpersFor!]));
 return activeCampaignProtection(characters.filter(character=>selected.has(character.name)).map(character=>({...character,campaignsRequiredIn:[]})),progress,battles,selected);
}
