import {fileCache} from "./fileCache";
export type CatalogCharacter={id:string;name:string;fullName:string;shortName:string;title:string;faction:string;alliance:string;initialRarity:string;icon:string;traits:string[];equipment:string[];requiredInCampaign:boolean;campaignsRequiredIn:string[];activeAbilityId?:string;passiveAbilityIds?:string;movement?:number|null};
type Catalog={source:string;sourceCharacterCount:number;characters:CatalogCharacter[]};
export const getCharacterCatalog=fileCache(["data/character_catalog.json"],([text])=>JSON.parse(text!) as Catalog);
export async function getCatalogCharacter(value:string){const c=await getCharacterCatalog();const key=value.toLowerCase();return c.characters.find(x=>x.id.toLowerCase()===key||x.name.toLowerCase()===key||x.fullName.toLowerCase()===key||x.shortName.toLowerCase()===key);}

export type AbilityBreakpoint={practical:string;high:string;priority:string;modes:string[];note:string};
export type CharacterAbilityGuidance={active:AbilityBreakpoint;passive:AbilityBreakpoint;confidence:string};
type BreakpointFile=Record<string,CharacterAbilityGuidance|unknown>;
export const getAbilityBreakpoints=fileCache(["config/ability_breakpoints.json","config/owned_ability_recommendations.json"],([reviewedText,planningText])=>{const reviewed=JSON.parse(reviewedText!) as BreakpointFile;const planning=JSON.parse(planningText!) as Record<string,{active:number;passive:number;note:string;source?:string}>;return {...Object.fromEntries(Object.entries(planning).filter(([name])=>name!=="_meta").map(([name,entry])=>[name,{active:{practical:String(entry.active),high:String(entry.active),priority:"situational",modes:[],note:`Planning recommendation: ${entry.note}`},passive:{practical:String(entry.passive),high:String(entry.passive),priority:"situational",modes:[],note:`Planning recommendation: ${entry.note}`},confidence:"planning"}])),...reviewed};});
export async function getAbilityGuidance(name:string){const d=await getAbilityBreakpoints();return d[name] as CharacterAbilityGuidance|undefined;}

export type AbilityEvidence={url:string;date?:string;supports?:string[]};
const abilityEvidence=fileCache(["config/ability_breakpoint_sources.json"],([text])=>JSON.parse(text!) as Record<string,AbilityEvidence[]|unknown>);
export async function getAbilityEvidence(name:string){const entries=(await abilityEvidence())[name];return Array.isArray(entries)?entries as AbilityEvidence[]:[];}

export type CampaignTarget={rank?:string;active?:string;passive?:string;role?:string;confidence?:string;note?:string;evidence?:string[]};
export type CampaignTargetFile={_meta:Record<string,unknown>;campaigns:Record<string,{status:string;characters:Record<string,CampaignTarget>} >};
export const getCampaignTargets=fileCache(["config/campaign_elite_targets.json"],([text])=>JSON.parse(text!) as CampaignTargetFile);

export type CampaignEvidence={title:string;url:string;published?:string;note:string};
export type CampaignEvidenceFile={_meta:Record<string,unknown>;sources:Record<string,CampaignEvidence>};
export const getCampaignEvidence=fileCache(["config/campaign_elite_sources.json"],([text])=>JSON.parse(text!) as CampaignEvidenceFile);
