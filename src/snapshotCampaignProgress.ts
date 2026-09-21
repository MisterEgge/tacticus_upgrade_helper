import fs from "node:fs/promises";
import path from "node:path";
import { advancedCampaigns, buildCampaignSnapshot, type CampaignCharacter, type CampaignSnapshot, type SnapshotPlayer } from "./domain/campaigns";

async function main()
{

    const player = JSON.parse(await fs.readFile("data/player.json", "utf8")) as SnapshotPlayer;
    const catalog = JSON.parse(await fs.readFile("data/character_catalog.json", "utf8")) as { characters: CampaignCharacter[] };
    if (!player.player?.progress?.campaigns) throw new Error("Campaign progress unavailable; history was not changed.");
    const snapshot = buildCampaignSnapshot(player, catalog.characters, new Date().toISOString());
    const dir = path.join("data", "history", "campaigns");
    await fs.mkdir(dir, { recursive: true });
    const files = (await fs.readdir(dir)).filter(f => f.endsWith(".json") && f !== "latest.json");
    // Fail visibly on corrupt history instead of silently discarding evidence.
    const history = await Promise.all(files.map(async f => JSON.parse(await fs.readFile(path.join(dir, f), "utf8")) as CampaignSnapshot));
    const advances = advancedCampaigns(snapshot, history);
    const latestApi = Math.max(0, ...history.map(s => s.apiLastUpdatedOn ?? 0));
    if (snapshot.apiLastUpdatedOn !== null && snapshot.apiLastUpdatedOn < latestApi)
        throw new Error("Stale API response; campaign history was not changed.");

    // Preserve roster observations even without progress, so the next advance
    // can be compared with the actual previously observed ranks and abilities.
    const previous = history.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).at(-1);
    const changed = !previous || previous.schemaVersion !== 2 || JSON.stringify(previous.campaigns) !== JSON.stringify(snapshot.campaigns);
    if (changed)
    {

        const stamp = snapshot.capturedAt.replace(/[:.]/g, "-");
        await fs.writeFile(path.join(dir, stamp + ".json"), JSON.stringify({ ...snapshot, advancedCampaignIds: advances }, null, 2), { flag: "wx" });

    }
    const temporary = path.join(dir, "latest.json.tmp");
    await fs.writeFile(temporary, JSON.stringify(snapshot, null, 2));
    await fs.rename(temporary, path.join(dir, "latest.json"));
    console.log(advances.length ? `Saved ${advances.length} campaign advance(s).` : changed ? "Saved roster/progress observation; no confirmed new milestone." : "No changed campaign observation.");

}

main().catch(error => { console.error(error); process.exitCode = 1; });
