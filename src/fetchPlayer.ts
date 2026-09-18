import "dotenv/config";
import fs from "node:fs/promises";

async function main()
{

    const apiKey = process.env.TACTICUS_API_KEY;

    if (!apiKey)
    {

        throw new Error("Missing TACTICUS_API_KEY in .env");

    }

    await fs.mkdir("data", { recursive: true });

    const response = await fetch("https://api.tacticusgame.com/api/v1/player", {
        method: "GET",
        headers: {
            "X-API-Key": apiKey
        }
    });

    console.log(`GET /api/v1/player -> ${response.status}`);

    const text = await response.text();

    if (!response.ok)
    {

        console.log(text);
        throw new Error("Player API request failed.");

    }

    const json = JSON.parse(text);

    await fs.writeFile("data/player.json", JSON.stringify(json, null, 2));

    console.log("Saved player data to data/player.json");

}

main();