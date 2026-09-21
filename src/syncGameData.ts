import fs from "node:fs/promises";
const files=[
 {name:"campaign-battles.json",url:"https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/fsd/4-entities/campaign/data/new-battle-data.json"},
 {name:"upgrade-recipes.json",url:"https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/fsd/4-entities/upgrade/data/new-recipe-data.json"},
 {name:"campaign-configs.json",url:"https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/fsd/4-entities/campaign/data/campaign-configs.json"},
 {name:"rank-up-data.json",url:"https://raw.githubusercontent.com/svehera/tacticusplanner/develop/src/fsd/4-entities/character/data/new-rank-up-data.json"}
];
await fs.mkdir("data/game",{recursive:true});
for(const file of files){const r=await fetch(file.url);if(!r.ok)throw new Error(`${file.name}: HTTP ${r.status}`);const text=await r.text();JSON.parse(text);await fs.writeFile(`data/game/${file.name}`,text);console.log(`Synced ${file.name} (${Math.round(text.length/1024)} KB)`);}
console.log("Campaign data source validated.");
await fs.writeFile("data/game/source.json",JSON.stringify({source:"svehera/tacticusplanner",branch:"develop",syncedAt:new Date().toISOString()},null,2));