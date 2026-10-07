import fs from "node:fs/promises";
import {buildResourceIcons} from "./domain/resourceIcons";
const repo="svehera/tacticusplanner";
async function json(url:string){const response=await fetch(url);if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);return response.json();}
const commit=(await json(`https://api.github.com/repos/${repo}/commits/develop`)).sha as string;
const tree=await json(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`);
if(tree.truncated)throw new Error("Resource asset tree is incomplete");
const paths=new Set<string>(tree.tree.filter((entry:{type:string;path:string})=>entry.type==="blob"&&entry.path.startsWith("src/assets/images/")).map((entry:{path:string})=>entry.path.slice("src/assets/images/".length)));
const [recipes,shops]=await Promise.all([fs.readFile("data/game/upgrade-recipes.json","utf8").then(JSON.parse),fs.readFile("data/game/shops.json","utf8").then(JSON.parse)]);
const catalog=buildResourceIcons(commit,paths,recipes,shops.equipment);
await fs.writeFile("data/game/resource-icons.json",JSON.stringify(catalog,null,2)+"\n");
console.log(`Verified ${Object.keys(catalog.icons).length} resource icons; ${catalog.missing.length} unresolved IDs retain their names.`);
