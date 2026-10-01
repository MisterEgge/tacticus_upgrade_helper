// Production HTTP smoke test. Fixtures live only in a temporary directory;
// never overwrite the user's player export, report, or history.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = process.cwd();
const cwd = await mkdtemp(path.join(tmpdir(), 'tacticus-http-test-'));
let server;
try
{

    for (const name of ['.next', 'node_modules', 'public', 'data', 'config', 'next.config.ts']) await symlink(path.join(root, name), path.join(cwd, name));
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
    assert.match(await get('/abilities'), /npm run refresh/);
    const report = {
        generatedAt: '2026-09-01T12:00:00.000Z',
        source: { player: 'SYNTHETIC TEST FIXTURE', powerLevel: 52 },
        summary: { units: 1, charactersWithAbilitiesBelow17: 0, individualAbilityUpgradesTo17: 0, legendaryUnderTierSlots: 0 },
        roster: [{ id: 'necroSpyder', name: 'Aleph-Null', faction: 'Necrons', grandAlliance: 'Xenos', rank: 0, upgrades: [0], rarity: 'Common', progressionIndex: 0, xpLevel: 1, shards: 0, mythicShards: 0, abilities: [{ id: 'a', level: 1 }, { id: 'p', level: 1 }], items: [] }],
        abilityQueue: [], unequippedInventory: [], upgradeInventory: [],
        equipmentAllocation: { equipNow: [], buyWatch: [], compatibilityUnknown: [] },
        campaignProgress: [{ id: 'synthetic', name: 'Indomitus', type: 'EliteMirror', highestUnlockedBattle: 39, highestCompletedBattle: 38, battles: [{ battleIndex: 38 }] }]
    };
    report.roster.push({ ...report.roster[0], id: 'test-machine-outside-character-catalog', name: 'Synthetic excluded unit' });
    const reportPath = path.join(cwd, 'output/upgrade-report.json');
    await writeFile(reportPath, JSON.stringify(report));
    assert.match(await get('/abilities'), /Uncommon: \? owned/);
    report.abilityBadges = { Xenos: [{ rarity: 'Uncommon', amount: 7 }] };
    await writeFile(reportPath, JSON.stringify(report));
    assert.match(await get('/abilities'), /Uncommon: 7 owned/);
    const campaigns = await get('/campaigns');
    assert.match(campaigns, /Indomitus Mirror Elite/);
    assert.match(campaigns, /<h2>Indomitus Mirror Elite<\/h2>.*?class="power">38/s);
    assert.match(campaigns, /Elite 3★ Upgrade Planner/);
    assert.match(campaigns, /completed through/);
    assert.doesNotMatch(campaigns, /Tyranids Elite/);
    const dashboard = await get('/');
    const war = await get('/war-defense');
    assert.match(war, /distinct defense teams/);
    assert.doesNotMatch(war, /DEFENSE SOURCE OPTIONS/);
    const catalog = JSON.parse(await readFile(path.join(root, 'data/character_catalog.json'), 'utf8'));
    assert.match(dashboard, /ACCOUNT OVERVIEW/);
    assert.match(dashboard, /Recommended next characters/);
    const ratings = await get('/ratings');
    assert.match(ratings, new RegExp(`${catalog.characters.length}<strong> catalog characters`));
    assert.match(ratings, /No tracked signal/);
    for (const route of ['/', '/equipment', '/equipment-demand', '/abilities', '/ratings', '/characters', '/characters/necroSpyder', '/inventory', '/guild-raid', '/war-defense'])
    {

        const html = await get(route);
        assert.match(html, /class="accountBar"/);
        assert.match(html, /SYNTHETIC TEST FIXTURE/);
        assert.match(html, /LEVEL<\/small><strong>52/);
        assert.match(html, new RegExp(`UNLOCKED UNITS<\\/small><strong>2<\\/strong><span>1\\/${catalog.characters.length} characters · 1 machines\\/other`));
        assert.match(html, /MAIN RAID TEAM/);
        assert.match(html, /Sync Account/);
        assert.match(html, /Last synced:/);

    }
    const invalid = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boss: 'Magnus', teamName: 'Custodes', flex: ['Ragnar', 'Ragnar'] }) });
    assert.equal(invalid.status, 400);
    const saved = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boss: 'Magnus', teamName: 'Custodes', flex: ['Dante'] }) });
    assert.equal(saved.status, 200);
    const cookie = saved.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    const savedDashboard = await fetch('http://127.0.0.1:3197/', { headers: { Cookie: cookie } });
    const savedHtml = (await savedDashboard.text()).replace(/<!--.*?-->/gs, '');
    assert.match(savedHtml, /MAIN RAID TEAM.*?Custodes.*?Magnus · Kariyan · Kharn · Trajann · Dante/s);
    const savedPlanner = await fetch('http://127.0.0.1:3197/guild-raid', { headers: { Cookie: cookie } });
    assert.match((await savedPlanner.text()).replace(/<!--.*?-->/gs, ''), /Custodes vs Magnus/);
    const roadmap = await get('/guild-raid');
    assert.match(roadmap, /LAVISCUS BUILD ORDER/);
    assert.match(roadmap, /<th>Rank \/ level<\/th>/);
    assert.doesNotMatch(roadmap, /<th>Role<\/th>|<th>XP level<\/th>|CORE OWNED/);
    assert.match(roadmap, /<details class="referenceDetails"><summary>Meta source<\/summary>/);
    assert.doesNotMatch(roadmap, /<details[^>]*class="referenceDetails"[^>]*open/);
    assert.match(roadmap, /<details class="navGroup"><summary[^>]*>Equipment<\/summary>/);
    assert.match(roadmap, /<summary[^>]*>Resources<\/summary>/);
    assert.match(roadmap, /<summary[^>]*>Roster<\/summary>/);
    assert.doesNotMatch(roadmap, /class="navMore"/);
    assert.match(roadmap, /href="\/review-status"/);
    assert.match(ratings, /<summary>Rating criteria<\/summary>/);
    for(const route of ['/inventory-cleanout','/reallocation']) assert.match(await get(route), /class="accountBar"/);

    assert.match(roadmap, /Checkpoint 1: Core to Gold I/);
    assert.match(roadmap, /Do next · checkpoint/);
    assert.match(roadmap, /Biovore is a separate machine of war/);
    assert.match(await get('/review-status'), /Every owned character/);
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
    for (const name of ['Imospekh', 'Anuphet', 'Thutmose', 'Makhotep'])
    {
        const character = catalog.characters.find(row => row.name === name);
        assert.ok(character);
        report.roster.push({ ...report.roster[0], id: character.id, name });
    }
    await writeFile(reportPath, JSON.stringify(report));
    const lineup = await get('/war-defense');
    assert.match(lineup, /class="warTeamTitle"[^>]*>Imospekh \/ Aleph-Null \/ Makhotep \/ Thutmose \/ Anuphet/);
    assert.match(lineup, /class="warTeamPortraits"[^>]*>.*?alt="Imospekh".*?alt="Makhotep"/s);
    for(const name of ['Trajann','Kariyan']){const character=catalog.characters.find(row=>row.name===name);report.roster.push({...report.roster[0],id:character.id,name,rarity:'Legendary'});}
    report.roster.find(unit=>unit.name==='Imospekh').items=[{slotId:'Slot1',id:'I_Crit_E001',name:'War test weapon',rarity:'Epic',level:5}];
    report.roster.find(unit=>unit.name==='Imospekh').rarity='Legendary';
    report.equipmentAllocation.equipNow=[{character:"Trajann",characterId:catalog.characters.find(character=>character.name==="Trajann").id,slotId:"Slot1",currentItem:"Old test item",currentRarity:"Epic",currentLevel:5,accountPriority:90,recommendedItemId:"I_Crit_L001",recommendedItem:"Grand Combat Knife"}];
    report.equipmentAllocation.buyWatch=[{character:"Kariyan",characterId:catalog.characters.find(character=>character.name==="Kariyan").id,slotId:"Slot1",currentItem:"Other test item",currentRarity:"Epic",currentLevel:4,accountPriority:80,recommendedItemId:"I_Crit_L001",recommendedItem:"Grand Combat Knife"}];
    report.unequippedInventory=[{id:"I_Crit_L001",amount:1,level:1}];
    await writeFile(reportPath,JSON.stringify(report));
    const readyEquipment=await get('/equipment');
    assert.match(readyEquipment,/aria-label="Equip now".*?<h2>Equip now.*?<td>.*?Trajann.*?<\/td>.*?Grand Combat Knife.*?Old test item/s);
    assert.doesNotMatch(readyEquipment,/>Slot[123]</);
    assert.doesNotMatch(readyEquipment,/Recipients and focus|Character Upgrade Queue|total needed item options/);
    assert.doesNotMatch(readyEquipment,/Inventory upgrade choices/);
    report.unequippedInventory[0].amount=2;
    await writeFile(reportPath,JSON.stringify(report));
    assert.match(await get('/equipment'),/Inventory upgrade choices.*?Kariyan.*?Grand Combat Knife/s);
    report.unequippedInventory[0].amount=1;
    await writeFile(reportPath,JSON.stringify(report));
    const shopEquipment=await get('/equipment');
    assert.match(shopEquipment,/Where and when/);
    assert.match(shopEquipment,/War test weapon · level 9/);
    assert.match(shopEquipment,/Equipment upgrade focus/);
    assert.doesNotMatch(await get('/abilities'),/Level eligible now|level eligible<\/small>/);
    assert.match(shopEquipment,/Kariyan.*?Grand Combat Knife.*?(Guild Shop|Crusade Shop|Rogue Trader)/s);
    assert.match(shopEquipment,/UTC/);
    assert.match(shopEquipment,/Random item pool · check stock/);
    const tyrith=catalog.characters.find(character=>character.name==='Tyrith');
    assert.ok(tyrith);
    report.roster.push({...report.roster[0],id:tyrith.id,name:'Tyrith',items:[{slotId:'Slot1',id:'I_Crit_E010',name:'Adorned Ceremonial Knife',rarity:'Epic',level:1}]});
    report.equipmentAllocation.buyWatch.push({character:'Tyrith',characterId:tyrith.id,slotId:'Slot1',preferredLegendaryItemIds:['I_Crit_L010'],preferredLegendaryItems:['Grand Ceremonial Knife']});
    await writeFile(reportPath,JSON.stringify(report));
    const tyrithPage=await get('/characters/'+tyrith.id);
    assert.match(tyrithPage,/href="\/sources\?item=I_Crit_L010"/);
    assert.match(tyrithPage,/Crusade Shop.*?Daily \(UTC\).*?715 Crusade Credits.*?Random item pool.*?Ad refresh/s);
    console.log('PASS: production routes, report refresh, Mirror Elite planner, multi-rank farming, invalid goal and missing inventory states');

}
finally
{

    if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
    await rm(cwd, { recursive: true, force: true });

}
