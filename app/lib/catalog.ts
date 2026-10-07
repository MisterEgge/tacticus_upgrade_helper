import fs from "node:fs/promises";import path from "node:path";
export type CatalogCharacter={id:string;name:string;fullName:string;shortName:string;title:string;faction:string;alliance:string;initialRarity:string;icon:string;traits:string[];equipment:string[];requiredInCampaign:boolean;campaignsRequiredIn:string[];activeAbilityId?:string;passiveAbilityIds?:string;movement?:number|null};
type Catalog={source:string;sourceCharacterCount:number;characters:CatalogCharacter[]};
let cache:Catalog|null=null;
export async function getCharacterCatalog(){if(cache)return cache;cache=JSON.parse(await fs.readFile(path.join(process.cwd(),"data","character_catalog.json"),"utf8")) as Catalog;return cache;}
export async function getCatalogCharacter(value:string){const c=await getCharacterCatalog();const key=value.toLowerCase();return c.characters.find(x=>x.id.toLowerCase()===key||x.name.toLowerCase()===key||x.fullName.toLowerCase()===key||x.shortName.toLowerCase()===key);}

export type AbilityBreakpoint={practical:string;high:string;priority:string;modes:string[];note:string};
export type CharacterAbilityGuidance={active:AbilityBreakpoint;passive:AbilityBreakpoint;confidence:string};
type BreakpointFile=Record<string,CharacterAbilityGuidance|unknown>;
let breakpointCache:BreakpointFile|null=null;
export async function getAbilityBreakpoints(){if(!breakpointCache){const [reviewedText,planningText]=await Promise.all([fs.readFile(path.join(process.cwd(),"config","ability_breakpoints.json"),"utf8"),fs.readFile(path.join(process.cwd(),"config","owned_ability_recommendations.json"),"utf8")]);const reviewed=JSON.parse(reviewedText) as BreakpointFile;const planning=JSON.parse(planningText) as Record<string,{active:number;passive:number;note:string;source?:string}>;breakpointCache={...Object.fromEntries(Object.entries(planning).filter(([name])=>name!=="_meta").map(([name,entry])=>[name,{active:{practical:String(entry.active),high:String(entry.active),priority:"situational",modes:[],note:`Planning recommendation: ${entry.note}`},passive:{practical:String(entry.passive),high:String(entry.passive),priority:"situational",modes:[],note:`Planning recommendation: ${entry.note}`},confidence:"planning"}])),...reviewed};}return breakpointCache;}
export async function getAbilityGuidance(name:string){const d=await getAbilityBreakpoints();return d[name] as CharacterAbilityGuidance|undefined;}

export type AbilityEvidence={url:string;date?:string;supports?:string[]};
let abilityEvidenceCache:Record<string,AbilityEvidence[]|unknown>|null=null;
export async function getAbilityEvidence(name:string){if(!abilityEvidenceCache)abilityEvidenceCache=JSON.parse(await fs.readFile(path.join(process.cwd(),"config","ability_breakpoint_sources.json"),"utf8"));const entries=abilityEvidenceCache![name];return Array.isArray(entries)?entries as AbilityEvidence[]:[];}

export type CampaignTarget={rank?:string;active?:string;passive?:string;role?:string;confidence?:string;note?:string;evidence?:string[]};
export type CampaignTargetFile={_meta:Record<string,unknown>;campaigns:Record<string,{status:string;characters:Record<string,CampaignTarget>} >};
let campaignTargetCache:CampaignTargetFile|null=null;
export async function getCampaignTargets(){if(!campaignTargetCache)campaignTargetCache=JSON.parse(await fs.readFile(path.join(process.cwd(),"config","campaign_elite_targets.json"),"utf8")) as CampaignTargetFile;return campaignTargetCache;}

export type CampaignEvidence={title:string;url:string;published?:string;note:string};
export type CampaignEvidenceFile={_meta:Record<string,unknown>;sources:Record<string,CampaignEvidence>};
let campaignEvidenceCache:CampaignEvidenceFile|null=null;
export async function getCampaignEvidence(){if(!campaignEvidenceCache)campaignEvidenceCache=JSON.parse(await fs.readFile(path.join(process.cwd(),"config","campaign_elite_sources.json"),"utf8")) as CampaignEvidenceFile;return campaignEvidenceCache;}
