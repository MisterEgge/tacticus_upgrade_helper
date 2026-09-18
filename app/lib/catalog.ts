import fs from "node:fs/promises";import path from "node:path";
export type CatalogCharacter={name:string;fullName:string;shortName:string;title:string;faction:string;alliance:string;initialRarity:string;icon:string;traits:string[];equipment:string[];requiredInCampaign:boolean;campaignsRequiredIn:string[]};
type Catalog={source:string;characters:CatalogCharacter[]};
let cache:Catalog|null=null;
export async function getCharacterCatalog(){if(cache)return cache;cache=JSON.parse(await fs.readFile(path.join(process.cwd(),"data","character_catalog.json"),"utf8")) as Catalog;return cache;}
export async function getCatalogCharacter(name:string){const c=await getCharacterCatalog();return c.characters.find(x=>x.name===name||x.fullName===name||x.shortName===name);}
