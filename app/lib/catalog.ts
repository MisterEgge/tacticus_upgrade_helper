import fs from "node:fs/promises";import path from "node:path";
export type CatalogCharacter={id:string;name:string;fullName:string;shortName:string;title:string;faction:string;alliance:string;initialRarity:string;icon:string;traits:string[];equipment:string[];requiredInCampaign:boolean;campaignsRequiredIn:string[];activeAbilityId?:string;passiveAbilityIds?:string;movement?:number|null};
type Catalog={source:string;sourceCharacterCount:number;characters:CatalogCharacter[]};
let cache:Catalog|null=null;
export async function getCharacterCatalog(){if(cache)return cache;cache=JSON.parse(await fs.readFile(path.join(process.cwd(),"data","character_catalog.json"),"utf8")) as Catalog;return cache;}
export async function getCatalogCharacter(value:string){const c=await getCharacterCatalog();const key=value.toLowerCase();return c.characters.find(x=>x.id.toLowerCase()===key||x.name.toLowerCase()===key||x.fullName.toLowerCase()===key||x.shortName.toLowerCase()===key);}
