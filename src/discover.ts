import "dotenv/config";
import fs from "node:fs/promises";

const swaggerUrls = [
    "https://api.tacticusgame.com/v3/api-docs",
    "https://api.tacticusgame.com/api-docs",
    "https://api.tacticusgame.com/swagger/v1/swagger.json",
    "https://api.tacticusgame.com/openapi.json"
];

async function main() {

    /*
    npx tsx src/fetchPlayer.ts
    */
    await fs.mkdir("data", { recursive: true });

    for (const url of swaggerUrls) {

        try {

            const response = await fetch(url);

            console.log(`${url} -> ${response.status}`);

            if (!response.ok) {

                continue;

            }

            const json = await response.json();

            await fs.writeFile("data/openapi.json", JSON.stringify(json, null, 2));

            console.log("\nSaved OpenAPI spec to data/openapi.json\n");

            const paths = Object.keys(json.paths ?? {});

            for (const path of paths) {

                const methods = Object.keys(json.paths[path] ?? {}).join(", ").toUpperCase();

                console.log(`${methods.padEnd(12)} ${path}`);

            }

            console.log("\nSecurity schemes:");
            console.log(JSON.stringify(json.components?.securitySchemes ?? {}, null, 2));

            return;

        }
        catch (error) {

            console.log(`${url} failed`);
            console.log(error);

        }

    }

    throw new Error("Could not find OpenAPI spec.");

}

main();