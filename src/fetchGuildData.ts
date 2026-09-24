import "dotenv/config";
import fs from "node:fs/promises";

async function fetchData(path:string,key:string):Promise<unknown>
{
    const response=await fetch(`https://api.tacticusgame.com/api/v1/${path}`,{headers:{"X-API-Key":key}});
    const text=await response.text();
    console.log(`GET /api/v1/${path} -> ${response.status}`);
    if(!response.ok)throw new Error(`${path} API request failed: ${text}`);
    return JSON.parse(text);
}

async function main()
{
    const key=process.env.TACTICUS_API_KEY;
    if(!key)throw new Error("Missing TACTICUS_API_KEY in .env");
    await fs.mkdir("data",{recursive:true});
    const[guild,raid]=await Promise.all([fetchData("guild",key),fetchData("guildRaid",key)]);
    await Promise.all([fs.writeFile("data/guild.json",JSON.stringify(guild,null,2)),fs.writeFile("data/guild-raid.json",JSON.stringify(raid,null,2))]);
    console.log("Saved guild and guild raid data");
}

main();
