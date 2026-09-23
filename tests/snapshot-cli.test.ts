import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
test("snapshot CLI preserves baselines and roster changes, suppresses duplicate advances and rejects stale data", async () =>
{

    const cwd = await mkdtemp(path.join(tmpdir(), "tacticus-snapshot-test-"));
    const script = path.resolve("src/snapshotCampaignProgress.ts");
    const source = { metaData: { lastUpdatedOn: 100 }, player: { units: [{ id: "unit", rank: 1, progressionIndex: 1, abilities: [] }], progress: { campaigns: [{ id: "test", name: "Test", type: "Elite", battles: [{ battleIndex: 10 }] }] } } };
    const run = async () =>
    {

        await writeFile(path.join(cwd, "data/player.json"), JSON.stringify(source));
        return spawnSync(process.execPath, ["--import", require.resolve("tsx"), script], { cwd, encoding: "utf8" });

    };
    const observations = async () => (await readdir(path.join(cwd, "data/history/campaigns"))).filter(f => f !== "latest.json");
    try
    {

        await mkdir(path.join(cwd, "data"));
        await writeFile(path.join(cwd, "data/character_catalog.json"), JSON.stringify({ characters: [{ id: "unit", name: "Test Unit", campaignsRequiredIn: ["Test"] }] }));
        assert.equal((await run()).status, 0);
        assert.equal((await observations()).length, 1);
        assert.equal((await run()).status, 0);
        assert.equal((await observations()).length, 1);
        source.player.units[0]!.rank = 2;
        source.metaData.lastUpdatedOn++;
        assert.equal((await run()).status, 0);
        assert.equal((await observations()).length, 2);
        source.player.progress.campaigns[0]!.battles[0]!.battleIndex = 11;
        source.metaData.lastUpdatedOn++;
        assert.equal((await run()).status, 0);
        const names = await observations();
        const latest = JSON.parse(await readFile(path.join(cwd, "data/history/campaigns", names.sort().at(-1)!), "utf8"));
        assert.deepEqual(latest.advancedCampaignIds, ["test"]);
        assert.equal(latest.campaigns.test.requiredCharacters[0].rank, 2);
        source.metaData.lastUpdatedOn = 200;
        assert.equal((await run()).status, 0);
        assert.equal((await observations()).length, 3);
        source.metaData.lastUpdatedOn = 199;
        assert.notEqual((await run()).status, 0);
        assert.equal((await observations()).length, 3);

    }
    finally
    {

        await rm(cwd, { recursive: true, force: true });

    }

});
