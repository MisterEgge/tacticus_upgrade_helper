// Production HTTP smoke test. Fixtures live only in a temporary directory;
// never overwrite the user's player export, report, or history.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = process.cwd();
const cwd = await mkdtemp(path.join(tmpdir(), 'tacticus-http-test-'));
let server;
try
{

    for (const name of ['.next', 'node_modules', 'public', 'data', 'config']) await symlink(path.join(root, name), path.join(cwd, name));
    await writeFile(path.join(cwd, 'package.json'), '{"type":"module"}');
    await mkdir(path.join(cwd, 'output'));
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', cwd, '--hostname', '127.0.0.1', '--port', '3197'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = '';
    await new Promise((resolve, reject) =>
    {

        const timeout = setTimeout(() => reject(new Error('Server startup timed out: ' + logs)), 20000);
        const read = chunk =>
        {

            logs += chunk;
            if (logs.includes('Ready in')) { clearTimeout(timeout); resolve(); }

        };
        server.stdout.on('data', read);
        server.stderr.on('data', read);
        server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${logs}`)); });

    });
    const get = async route =>
    {

        const response = await fetch('http://127.0.0.1:3197' + route);
        assert.equal(response.status, 200, route);
        return (await response.text()).replace(/<!--.*?-->/gs, "");

    };
    assert.match(await get('/campaigns'), /Account data unavailable/);
    assert.match(await get('/abilities'), /OWNERSHIP UNKNOWN/);
    const report = {
        generatedAt: 'SYNTHETIC TEST FIXTURE — NOT ACCOUNT DATA',
        source: { player: 'SYNTHETIC TEST FIXTURE', powerLevel: 0 },
        summary: { units: 1, charactersWithAbilitiesBelow17: 0, individualAbilityUpgradesTo17: 0, legendaryUnderTierSlots: 0 },
        roster: [{ id: 'necroSpyder', name: 'Aleph-Null', faction: 'Necrons', grandAlliance: 'Xenos', rank: 0, upgrades: [0], rarity: 'Common', progressionIndex: 0, xpLevel: 1, shards: 0, mythicShards: 0, abilities: [{ id: 'a', level: 1 }, { id: 'p', level: 1 }], items: [] }],
        abilityQueue: [], unequippedInventory: [], upgradeInventory: [],
        equipmentAllocation: { equipNow: [], buyWatch: [], compatibilityUnknown: [] },
        campaignProgress: [{ id: 'synthetic', name: 'Indomitus', type: 'EliteMirror', highestUnlockedBattle: 39, highestCompletedBattle: 38, battles: [{ battleIndex: 38 }] }]
    };
    report.roster.push({ ...report.roster[0], id: 'test-machine-outside-character-catalog', name: 'Synthetic excluded unit' });
    const reportPath = path.join(cwd, 'output/upgrade-report.json');
    await writeFile(reportPath, JSON.stringify(report));
    const campaigns = await get('/campaigns');
    assert.match(campaigns, /Indomitus Mirror Elite/);
    assert.match(campaigns, /<h2>Indomitus Mirror Elite<\/h2>.*?class="power">38/s);
    assert.match(campaigns, /Elite 3★ Upgrade Planner/);
    assert.match(campaigns, /completed through/);
    assert.doesNotMatch(campaigns, /Tyranids Elite/);
    const dashboard = await get('/');
    assert.match(dashboard, /ACCOUNT OVERVIEW/);
    assert.match(dashboard, /Highest-priority characters/);
    for (const route of ['/equipment', '/equipment-demand', '/abilities', '/characters', '/characters/necroSpyder', '/inventory']) await get(route);
    assert.match(await get('/sources'), /Shops &amp; Sources/);
    assert.match(await get('/farming'), /Expected \/ battle/);
    const farming = await get('/farming?character=necroSpyder&target=3');
    assert.match(farming, /Synthetic excluded unit/);
    assert.match(farming, /Calculate materials/);
    assert.match(farming, /Expected \/ battle/);
    assert.match(await get('/farming?character=necroSpyder&target=0'), /Choose a target rank/);
    delete report.upgradeInventory;
    await writeFile(reportPath, JSON.stringify(report));
    assert.match(await get('/farming'), /Upgrade inventory unavailable/);
    console.log('PASS: production routes, report refresh, Mirror Elite planner, multi-rank farming, invalid goal and missing inventory states');

}
finally
{

    if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
    await rm(cwd, { recursive: true, force: true });

}
