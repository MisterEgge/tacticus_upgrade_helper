// Production HTTP smoke test. Fixtures live only in a temporary directory;
// never overwrite the user's player export, report, or history.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, copyFile, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { JSDOM } from 'jsdom';

const root = process.cwd();
const cwd = await mkdtemp(path.join(tmpdir(), 'tacticus-http-test-'));
let server;
try
{

    for (const name of ['.next', 'node_modules', 'public', 'data', 'config']) await symlink(path.join(root, name), path.join(cwd, name), process.platform === 'win32' ? 'junction' : 'dir');
    await copyFile(path.join(root, 'next.config.ts'), path.join(cwd, 'next.config.ts'));
    await writeFile(path.join(cwd, 'package.json'), '{"type":"module"}');
    await mkdir(path.join(cwd, 'output'));
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', cwd, '--hostname', '127.0.0.1', '--port', '3197'], { cwd, env: { ...process.env, TACTICUS_AUTO_SYNC: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    const get = async (route, raw = false) =>
    {

        const response = await fetch('http://127.0.0.1:3197' + route);
        assert.equal(response.status, 200, route);
        const html = (await response.text()).replace(/<!--.*?-->/gs, "");
        if (raw || !response.headers.get("content-type")?.includes("text/html")) return html;
        // Cost assertions concern visible names and numbers. Image coverage is
        // checked against the raw response separately, independent of wrappers.
        const dom = new JSDOM(html);
        dom.window.document.querySelectorAll('.resourceName').forEach(node => node.replaceWith(dom.window.document.createTextNode(node.textContent)));
        // Compare player-facing meanings consistently for both image and text badges.
        dom.window.document.querySelectorAll('.gameBadge').forEach(node => node.replaceWith(dom.window.document.createTextNode(node.getAttribute('aria-label') ?? node.getAttribute('title') ?? node.textContent)));
        const result = dom.window.document.documentElement.outerHTML;
        dom.window.close();
        return result;

    };
    const initialSync = JSON.parse(await get('/api/sync'));
    assert.equal(initialSync.automatic, false);
    assert.equal(initialSync.running, false);
    assert.equal(initialSync.lastSynced, null);
    assert.equal(initialSync.timezone, 'America/Chicago');
    assert.match(await get('/campaigns'), /Account data unavailable/);
    assert.match(await get('/abilities'), /npm run refresh/);
    assert.match(await get('/orbs'), /npm run refresh/);
    assert.match(await get('/onslaught'), /npm run refresh/);
    assert.match(await get('/material-completion'), /Account or farming data unavailable/);
    assert.match(await get('/elite-farming-gaps'), /Elite access unknown/);
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
    const machineDetail=await get('/characters/test-machine-outside-character-catalog');
    assert.match(machineDetail,/Character planning unavailable · unit type needs verification/);
    assert.doesNotMatch(machineDetail,/Next level \d+ eligible|provisional baseline|Next level cost/);
    const unknownBadges=new JSDOM(await get('/abilities'));
    const unknownBadgeRow=[...unknownBadges.window.document.querySelectorAll('[aria-label="Xenos badge totals"] tbody tr')].find(row=>row.cells[0].textContent==='Uncommon');
    assert.match(unknownBadgeRow.textContent,/UncommonSync account/);
    unknownBadges.window.close();
    assert.match(await get('/orbs'), /Orb inventory unavailable/);
    report.roster[0].shards = 40;
    report.orbInventory = { Xenos: [{ rarity: 'Uncommon', amount: 7 }] };
    await writeFile(reportPath, JSON.stringify(report));
    assert.equal(JSON.parse(await get('/api/sync')).lastSynced, report.generatedAt);
    const orbs = await get('/orbs');
    assert.match(orbs, /Orb priorities/);
    const orbDom = new JSDOM(orbs);
    const uncommonRow = orbDom.window.document.querySelector('[aria-label="Uncommon orb shopping"] tbody tr');
    assert.deepEqual([...uncommonRow.cells].slice(2).map(cell => cell.textContent), ["7", "10", "3"]);
    assert.ok(uncommonRow.querySelector('a[href="/characters/necroSpyder"]'));
    orbDom.window.close();
    assert.doesNotMatch(orbs, /Synthetic excluded unit/);
    report.roster[0] = { ...report.roster[0], progressionIndex: 8, shards: 50, rarity: 'Rare' };
    report.orbInventory = { Xenos: [{ rarity: 'Epic', amount: 4 }] };
    await writeFile(reportPath, JSON.stringify(report));
    const readyOrbs = await get('/orbs');
    assert.match(readyOrbs, /Shard-ready orb shopping list/);
    const readyDom = new JSDOM(readyOrbs);
    const epicTable = readyDom.window.document.querySelector('[aria-label="Epic orb shopping"]');
    assert.deepEqual([...epicTable.querySelectorAll('th')].map(cell => cell.textContent), ["Alliance", "Characters", "Owned", "Needed", "Short"]);
    assert.deepEqual([...epicTable.querySelector('tbody tr').cells].slice(2).map(cell => cell.textContent), ["4", "10", "6"]);
    assert.ok(epicTable.querySelector('a[href="/characters/necroSpyder"]'));
    assert.equal(epicTable.querySelectorAll('table').length, 0);
    assert.doesNotMatch(epicTable.textContent, /Ascend to Epic|10 Xenos Epic|Shards ready|allocated/);
    readyDom.window.close();
    const honor = await get('/onslaught');
    assert.match(honor, /Onslaught honor priorities/);
    assert.match(honor, /aria-label="Xenos honor priorities".*?Aleph-Null.*?Farm Epic orbs: 6 short/s);
    assert.match(honor, /one regenerates every 16 hours/);
    assert.match(honor, /role="tablist" aria-label="Onslaught alliance"/);
    assert.match(honor, /aria-label="Imperial honor priorities".*?0 recommendations/s);
    assert.match(await get('/onslaught', true), /data-resource-id="onslaughtToken".*?<img/s);
    const forcas = { ...report.roster[0], id: 'darkaCompanion', name: 'Forcas', faction: 'DarkAngels', grandAlliance: 'Imperial', shards: 45 };
    report.roster.push(forcas);
    report.orbInventory.Imperial = [{ rarity: 'Epic', amount: 0 }];
    await writeFile(reportPath, JSON.stringify(report));
    const shardBlocked = await get('/orbs');
    const blockedDom = new JSDOM(shardBlocked);
    assert.equal(blockedDom.window.document.querySelector('a[href="/characters/darkaCompanion"]'), null);
    blockedDom.window.close();
    const honorForcas = new JSDOM(await get('/onslaught'));
    const imperialHonors = honorForcas.window.document.querySelector('[aria-label="Imperial honor priorities"]');
    assert.ok(imperialHonors.querySelector('a[href="/characters/darkaCompanion"]'));
    assert.ok(imperialHonors.querySelector('[aria-label="Rare · 1 red star"] img[src="/progression/red-star.png"]'));
    assert.match(imperialHonors.textContent, /Rare → Epic.*5 shards short of Epic/s);
    assert.match(imperialHonors.textContent, /45 \/ 50 shards for Epic/);
    assert.doesNotMatch(imperialHonors.textContent, /6 stars/);
    honorForcas.window.close();
    const beforeChaos = report.roster.length;
    report.roster.push(
      { ...report.roster[0], id: 'thousTzaangor', name: 'Yazaghor', faction: 'ThousandSons', grandAlliance: 'Chaos', progressionIndex: 11, shards: 95 },
      { ...report.roster[0], id: 'worldTerminator', name: 'Wrask', faction: 'WorldEaters', grandAlliance: 'Chaos', progressionIndex: 9, shards: 0 },
      { ...report.roster[0], id: 'thousInfernalMaster', name: 'Abraxas', faction: 'ThousandSons', grandAlliance: 'Chaos', progressionIndex: 12, shards: 0 }
    );
    report.orbInventory.Chaos = [{ rarity: 'Legendary', amount: 100 }];
    await writeFile(reportPath, JSON.stringify(report));
    const quietChaos = new JSDOM(await get('/onslaught'));
    const chaosHonors = quietChaos.window.document.querySelector('[aria-label="Chaos honor priorities"]');
    assert.equal(chaosHonors.querySelectorAll('tbody tr').length, 3);
    assert.ok(chaosHonors.querySelector('a[href="/characters/thousTzaangor"]'));
    assert.match(chaosHonors.textContent, /Epic → Legendary/);
    assert.match(chaosHonors.textContent, /5 shards short of Legendary/);
    assert.match(chaosHonors.textContent, /Next rarity · 250 shards short of Legendary/);
    assert.match(chaosHonors.textContent, /Optional resource farming/);
    quietChaos.window.close();
    report.roster.length = beforeChaos;
    delete report.orbInventory.Chaos;
    report.roster.push({ ...report.roster[0], id: 'orksRuntherd', name: 'Snotflogga', faction: 'Orks', shards: 0 });
    await writeFile(reportPath, JSON.stringify(report));
    const passiveHonor = new JSDOM(await get('/onslaught'));
    assert.equal(passiveHonor.window.document.querySelector('[aria-label="Xenos honor priorities"] tbody a[href="/characters/orksRuntherd"]'), null);
    assert.match(passiveHonor.window.document.querySelector('main').textContent, /Snotflogga · Salvage Run strongboxes/);
    passiveHonor.window.close();
    const snot = report.roster.at(-1);
    snot.progressionIndex = 15;
    await writeFile(reportPath, JSON.stringify(report));
    const legendarySources = new JSDOM(await get('/sources?item=I_Crit_L010'));
    assert.match(legendarySources.window.document.querySelector('table tbody').textContent, /Crusade Shop/);
    legendarySources.window.close();
    snot.progressionIndex = 16;
    await writeFile(reportPath, JSON.stringify(report));
    const mythicSources = new JSDOM(await get('/sources?item=I_Crit_L010'));
    assert.doesNotMatch(mythicSources.window.document.querySelector('table tbody').textContent, /Crusade Shop/);
    assert.match(mythicSources.window.document.querySelector('main').textContent, /Show unverified Crusade tiers \(reference\)/);
    mythicSources.window.close();
    report.roster.pop();
    await writeFile(reportPath, JSON.stringify(report));
    const forcasDetail = await get('/characters/darkaCompanion');
    assert.match(forcasDetail, /Collect shards for Epic/);
    assert.match(forcasDetail, /5 regular shards short · 45 \/ 50 owned/);
    assert.doesNotMatch(forcasDetail, /Orb totals and stores/);
    forcas.shards = 50;
    await writeFile(reportPath, JSON.stringify(report));
    const unblocked = new JSDOM(await get('/orbs'));
    const epicGroup = unblocked.window.document.querySelector('[aria-label="Epic orbs"]');
    assert.ok(epicGroup?.querySelector('a[href="/characters/darkaCompanion"]'));
    const imperialRow = epicGroup.querySelector('a[href="/characters/darkaCompanion"]').closest("tr");
    assert.deepEqual([...imperialRow.cells].slice(2).map(cell => cell.textContent), ["0", "10", "10"]);
    unblocked.window.close();
    report.roster.pop();
    delete report.orbInventory.Imperial;
    report.roster[0] = { ...report.roster[0], progressionIndex: 9, shards: 0, rarity: 'Epic' };
    report.orbInventory = { Xenos: [{ rarity: 'Epic', amount: 0 }] };
    await writeFile(reportPath, JSON.stringify(report));
    assert.doesNotMatch(await get('/orbs'), /aria-label="Epic orb shopping"/);
    report.abilityBadges = { Xenos: [{ rarity: 'Uncommon', amount: 7 }] };
    await writeFile(reportPath, JSON.stringify(report));
    const knownBadges=new JSDOM(await get('/abilities'));
    const knownBadgeRow=[...knownBadges.window.document.querySelectorAll('[aria-label="Xenos badge totals"] tbody tr')].find(row=>row.cells[0].textContent==='Uncommon');
    assert.equal(knownBadgeRow.cells[1].textContent,'7');
    knownBadges.window.close();
    const campaigns = await get('/campaigns');
    assert.match(campaigns, /Indomitus Mirror Elite/);
    assert.match(campaigns, /Stone I/);
    assert.match(campaigns, /<h2>Indomitus Mirror Elite<\/h2>.*?class="power">38/s);
    assert.match(campaigns, /Elite 3★ Upgrade Planner/);
    assert.match(campaigns, /class="campaignInvestmentGroup"><button type="button" class="campaignSectionToggle" aria-expanded="true" aria-controls="[^"]+"><h3>Indomitus Mirror Elite<\/h3>/);
    assert.match(campaigns, /class="campaignSectionToggle" aria-expanded="true" aria-controls="[^"]+".*?Account-specific campaign priorities/s);
    assert.match(campaigns, /completed through/);
    assert.doesNotMatch(campaigns, /Tyranids Elite/);
    const progressPanel=(dom,label)=>dom.window.document.getElementById([...dom.window.document.querySelectorAll('[role="tab"]')].find(tab=>tab.textContent===label).getAttribute('aria-controls'));
    const campaignTabs=new JSDOM(campaigns);
    assert.match(progressPanel(campaignTabs,'In progress').textContent,/Indomitus Mirror Elite/);
    assert.equal(progressPanel(campaignTabs,'Completed').hidden,true);
    assert.match(progressPanel(campaignTabs,'Completed').textContent,/No completed campaigns yet/);
    campaignTabs.window.close();
    const incompleteCampaign=report.campaignProgress[0];
    report.campaignProgress[0]={...incompleteCampaign,highestCompletedBattle:40,highestUnlockedBattle:40};
    await writeFile(reportPath,JSON.stringify(report));
    const completedTabs=new JSDOM(await get('/campaigns'));
    assert.doesNotMatch(progressPanel(completedTabs,'In progress').textContent,/Indomitus Mirror Elite/);
    assert.match(progressPanel(completedTabs,'Completed').textContent,/Indomitus Mirror Elite/);
    assert.doesNotMatch(progressPanel(completedTabs,'Completed').textContent,/Account-specific campaign priorities/);
    completedTabs.window.close();
    report.campaignProgress[0]=incompleteCampaign;
    await writeFile(reportPath,JSON.stringify(report));
    const dashboard = await get('/');
    const war = await get('/war-defense');
    assert.match(war, /defense teams/);
    assert.doesNotMatch(war, /DEFENSE SOURCE OPTIONS/);
    const catalog = JSON.parse(await readFile(path.join(root, 'data/character_catalog.json'), 'utf8'));
    assert.match(dashboard, /ACCOUNT OVERVIEW/);
    assert.match(dashboard, /Next upgrades/);
    const ratings = await get('/ratings');
    assert.match(ratings, new RegExp(`${catalog.characters.length}<strong> catalog characters`));
    assert.match(ratings, /No tracked signal/);
    for (const route of ['/', '/equipment', '/equipment-demand', '/abilities', '/orbs', '/ratings', '/characters', '/characters/necroSpyder', '/inventory', '/guild-raid', '/war-defense'])
    {

        const html = await get(route);
        assert.match(html, /class="accountBar"/);
        assert.match(html, /SYNTHETIC TEST FIXTURE/);
        assert.match(html, /LEVEL<\/small><strong>52/);
        assert.doesNotMatch(html, /<small>(POWER|UNLOCKED UNITS)<\/small>/);
        assert.match(html, /MAIN RAID TEAM/);
        assert.match(html, /Sync Account/);
        assert.match(html, /Last synced:/);

    }
    const invalid = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boss: 'Magnus', teamName: 'Custodes', flex: ['Ragnar', 'Ragnar'] }) });
    assert.equal(invalid.status, 400);
    const originalRoster = report.roster;
    const raidNames = ['Actus', 'Exitor-Rho', "Tan Gi'da", 'Gulgortz', 'Anuphet'];
    report.roster = raidNames.map(name => ({ ...originalRoster[0], ...catalog.characters.find(unit => unit.name === name), name, rank: 9, progressionIndex: 12, xpLevel: 35 }));
    report.roster.push({ ...originalRoster[0], id: 'necroReanimator', name: 'Reanimator' }, { ...originalRoster[0], id: 'ultraDreadnought', name: 'Galatian' });
    await writeFile(reportPath, JSON.stringify(report));
    const payload = { boss: 'Riptide', teamName: 'Ad-Mech', lineup: raidNames, flex: ['Gulgortz', 'Anuphet'], autoFlex: false, machine: 'Galatian', autoMachine: false };
    const saved = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(saved.status, 200);
    const cookie = saved.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    const savedDashboard = await fetch('http://127.0.0.1:3197/', { headers: { Cookie: cookie } });
    const savedHtml = (await savedDashboard.text()).replace(/<!--.*?-->/gs, '');
    assert.match(savedHtml, /MAIN RAID TEAM.*?Ad-Mech.*?5\/5 owned.*?Riptide · Actus · Exitor-Rho · Tan Gi&#x27;da · Gulgortz · Anuphet · MoW: Galatian/s);
    const savedPlanner = await fetch('http://127.0.0.1:3197/guild-raid', { headers: { Cookie: cookie } });
    const selectedHtml = (await savedPlanner.text()).replace(/<!--.*?-->/gs, '');
    const raidSelectionDom = new JSDOM(selectedHtml);
    const raidSelectors = raidSelectionDom.window.document.querySelectorAll('.raidOverview select');
    assert.deepEqual([...raidSelectors].map(select => select.value), ['Riptide', 'Ad-Mech']);
    assert.match(raidSelectionDom.window.document.querySelector('.raidLineupStrip').textContent, /Actus.*Exitor-Rho.*Tan Gi'da.*Gulgortz.*Anuphet.*Galatian/);
    assert.equal(raidSelectionDom.window.document.querySelector('[role="tablist"][aria-label="Guild Raid views"] [aria-selected="true"]').textContent, 'Battle guide');
    raidSelectionDom.window.close();
    assert.match(selectedHtml, /Machine of War plan/);
    assert.match(selectedHtml, /Turn orders for this archetype still need research/);
    assert.match(selectedHtml, /aria-label="Positioning guidance"/);
    assert.doesNotMatch(selectedHtml, /aria-label="Battle turn"/);
    assert.match(selectedHtml, /Anuphet.*?Plan rank materials/s);
    const selectedRows = selectedHtml.match(/<tbody>(.*?)<\/tbody>/s)?.[1];
    assert.ok(selectedRows);
    assert.doesNotMatch(selectedRows, /Trajann|Vitruvius|Galatian/);
    assert.match(selectedRows, /Anuphet/);
    // One shared armor copy must follow the saved Raid lineup across every view.
    const beforeEquipment={roster:report.roster,unequippedInventory:report.unequippedInventory,equipmentAllocation:report.equipmentAllocation};
    const rhoId=catalog.characters.find(unit=>unit.name==='Exitor-Rho').id;
    const benchMeta=catalog.characters.find(unit=>unit.name==='Trajann');
    report.roster=report.roster.map(unit=>unit.id===rhoId?{...unit,faction:'AdeptusMechanicus',items:[{id:'I_Defensive_L003',name:'Grand Plated Greaves',rarity:'Legendary',level:1,slotId:'Slot2'}]}:unit);
    report.roster.push({...originalRoster[0],id:benchMeta.id,name:'Trajann',faction:'Custodes',rarity:'Legendary',progressionIndex:12,items:[{id:'I_Defensive_E003',name:'Plated Greaves',rarity:'Epic',level:1,slotId:'Slot2'}]});
    const armorTarget=(character,characterId,currentRarity)=>({character,characterId,slotId:'Slot2',currentItem:'Greaves',currentRarity,currentLevel:1,accountPriority:character==='Trajann'?100:0,recommendedItemId:'I_Defensive_L004',recommendedItem:'Grand Mantle'});
    report.equipmentAllocation={equipNow:[armorTarget('Trajann',benchMeta.id,'Epic')],buyWatch:[armorTarget('Exitor-Rho',rhoId,'Legendary')],compatibilityUnknown:[]};
    report.unequippedInventory=[{id:'I_Defensive_L004',amount:1,level:1}];
    await writeFile(reportPath,JSON.stringify(report));
    const withRaid=async route=>new JSDOM(await(await fetch('http://127.0.0.1:3197'+route,{headers:{Cookie:cookie}})).text());
    const raidEquipment=await withRaid('/equipment');
    const equipmentReady=raidEquipment.window.document.querySelector('[aria-label="Equip now"] tbody');
    assert.match(equipmentReady.textContent,/Exitor-Rho.*Grand Mantle/s);assert.doesNotMatch(equipmentReady.textContent,/Trajann/);
    assert.equal(raidEquipment.window.document.querySelector('[aria-label="Equipment upgrade focus"]').value,'raid');
    raidEquipment.window.close();
    const rhoEquipment=await withRaid('/characters/'+rhoId);
    assert.match(rhoEquipment.window.document.querySelector('#equipment').textContent,/Equip Grand Mantle/);rhoEquipment.window.close();
    const benchEquipment=await withRaid('/characters/'+benchMeta.id);
    assert.doesNotMatch(benchEquipment.window.document.querySelector('#equipment').textContent,/Equip Grand Mantle/);benchEquipment.window.close();
    const raidCleanout=await withRaid('/inventory-cleanout');
    assert.match(raidCleanout.window.document.querySelector('[aria-label="Equip before cleaning out"] tbody').textContent,/Exitor-Rho.*Grand Mantle/s);raidCleanout.window.close();
    const raidRoster=await withRaid('/characters');
    const rhoRosterRow=raidRoster.window.document.querySelector('a[href="/characters/'+rhoId+'"]').closest('tr');
    assert.match(rhoRosterRow.textContent,/Equip Grand Mantle/);raidRoster.window.close();
    Object.assign(report,beforeEquipment);await writeFile(reportPath,JSON.stringify(report));
    const unowned = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, machine: 'Biovore' }) });
    assert.equal(unowned.status, 400);
    const forbidden = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, lineup: [...raidNames.slice(0, 4), 'Trajann'], flex: ['Gulgortz', 'Trajann'] }) });
    assert.equal(forbidden.status, 400);
    const dornPayload = { ...payload, boss: 'Rogal Dorn', machine: 'Reanimator' };
    const dornSave = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dornPayload) });
    assert.equal(dornSave.status, 200);
    const dornCookie = dornSave.headers.get('set-cookie')?.split(';')[0];
    assert.ok(dornCookie);
    const dornResponse = await fetch('http://127.0.0.1:3197/guild-raid', { headers: { Cookie: dornCookie } });
    assert.equal(dornResponse.status, 200);
    const dornDom = new JSDOM(await dornResponse.text());
    const dornGuide = dornDom.window.document.querySelector('[aria-label="Raid battle guide"]');
    assert.match(dornGuide.textContent, /Rogal Dorn:/);
    assert.equal(dornDom.window.document.querySelectorAll('.raidOverview select')[1].value, 'Ad-Mech');
    assert.match(dornGuide.textContent, /Rear-arc attacks/);
    const dornLabels = [...dornDom.window.document.querySelectorAll('label')];
    assert.equal(dornLabels.find(label => label.textContent.startsWith('Raid boss')).querySelector('select').value, 'Rogal Dorn');
    assert.equal(dornLabels.filter(label => label.textContent.startsWith('Character slot')).length, 5);
    dornDom.window.close();
    const dornBanned = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dornPayload, machine: 'Malleus Rocket Launcher' }) });
    assert.equal(dornBanned.status, 400);
    report.roster = originalRoster;
    await writeFile(reportPath, JSON.stringify(report));
    const roadmap = await get('/guild-raid');
    assert.match(roadmap, /Raid team roadmap/);
    assert.match(roadmap, /Choose 5 more characters in Team/);
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

    assert.match(roadmap, /Unlock selected characters to begin their upgrade plan/);
    assert.match(roadmap, /Do next · checkpoint/);
    assert.match(roadmap, /Biovore is a separate machine of war/);
    assert.match(await get('/review-status'), /Every owned character/);
    assert.match(await get('/sources'), /Shops &amp; Sources/);
    assert.match(await get('/farming'), /Expected \/ battle/);
    const completion = await get('/material-completion');
    assert.match(completion, /Material Completion/);
    assert.match(completion, /Through Adamantine II/);
    assert.match(completion, /Engram Neurochip/);
    assert.match(completion, /Done for owned roster/);
    assert.match(completion, /Unowned demand/);
    assert.doesNotMatch(completion, /Unknown future recipe/);
    assert.match(await get('/material-completion?target=17'), /Through Diamond III/);
    assert.match(await get('/material-completion?target=999'), /Choose a supported rank ceiling/);
    const eliteGaps = await get('/elite-farming-gaps');
    assert.match(eliteGaps, /Elite Farming Gaps/);
    assert.match(eliteGaps, /Campaign unlock opportunities/);
    assert.match(eliteGaps, /Include Mythic materials/);
    assert.doesNotMatch(eliteGaps, /type="checkbox" name="mythic"[^>]*checked/);
    assert.doesNotMatch(eliteGaps, /<small>Mythic<\/small>/);
    assert.match(await get('/elite-farming-gaps?mythic=1'), /<small>Mythic<\/small>/);
    assert.match(eliteGaps, /Unknown|No Elite source found/);
    assert.match(await get('/elite-farming-gaps?mythic=1&needed=1&target=17'), /Owned demand through Diamond III/);
    assert.match(await get('/elite-farming-gaps?target=999'), /Choose a supported rank ceiling/);
    assert.match(await get('/farming'), /href="\/elite-farming-gaps"/);
    assert.match(completion, /href="\/elite-farming-gaps\?target=19"/);
    const savedProgress = report.campaignProgress;
    const battleData = JSON.parse(await readFile(path.join(root, 'data/game/campaign-battles.json'), 'utf8'));
    const eliteNames = [...new Set(Object.values(battleData).filter(battle => battle.campaignType === 'Elite').map(battle => battle.campaign))];
    report.campaignProgress = eliteNames.map(name => ({ id: name, name, type: 'Elite', highestUnlockedBattle: 0, highestCompletedBattle: 0, battles: [] }));
    await writeFile(reportPath, JSON.stringify(report));
    const lockedGaps = await get('/elite-farming-gaps');
    assert.match(lockedGaps, /Elite nodes locked/);
    assert.match(lockedGaps, /class="campaignSectionToggle" aria-expanded="false" aria-controls="[^"]+"/);
    assert.match(lockedGaps, /next useful unlock: battle/);
    report.campaignProgress = savedProgress;
    await writeFile(reportPath, JSON.stringify(report));
    const farming = await get('/farming?character=necroSpyder&target=3');
    assert.match(farming, /Synthetic excluded unit/);
    assert.match(farming, /Calculate materials/);
    assert.match(farming, /Expected \/ battle/);
    assert.match(await get('/farming?character=necroSpyder&target=0'), /Choose a target rank/);
    delete report.upgradeInventory;
    await writeFile(reportPath, JSON.stringify(report));
    assert.match(await get('/farming'), /Upgrade inventory unavailable/);
    assert.match(await get('/material-completion'), /Upgrade inventory unavailable/);
    assert.match(await get('/elite-farming-gaps'), /Upgrade inventory unavailable/);
    for (const name of ['Imospekh', 'Anuphet', 'Thutmose', 'Makhotep'])
    {
        const character = catalog.characters.find(row => row.name === name);
        assert.ok(character);
        report.roster.push({ ...report.roster[0], id: character.id, name });
    }
    await writeFile(reportPath, JSON.stringify(report));
    const unreadyLineup = new JSDOM(await get('/war-defense'));
    assert.equal(unreadyLineup.window.document.querySelectorAll('.warDefenseCard').length,0);
    unreadyLineup.window.close();
    for(const unit of report.roster)unit.rank=9;
    await writeFile(reportPath,JSON.stringify(report));
    const lineup = await get('/war-defense');
    assert.match(lineup, /aria-label="Imospekh \/ Aleph-Null \/ Makhotep/);
    assert.match(lineup, /class="warDeployment"[^>]*>.*?alt="Imospekh".*?alt="Makhotep"/s);
    for(const name of ['Trajann','Kariyan']){const character=catalog.characters.find(row=>row.name===name);report.roster.push({...report.roster[0],id:character.id,name,rarity:'Legendary',progressionIndex:12});}
    report.roster.find(unit=>unit.name==='Imospekh').items=[{slotId:'Slot1',id:'I_Crit_E001',name:'War test weapon',rarity:'Epic',level:5}];
    report.roster.find(unit=>unit.name==='Imospekh').rarity='Legendary';
    report.roster.find(unit=>unit.name==='Imospekh').progressionIndex=12;
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
    report.unequippedInventory.push({id:"I_Crit_L001",amount:3,level:5});
    await writeFile(reportPath,JSON.stringify(report));
    const inventoryDom=new JSDOM(await get('/inventory',true));
    const knifeRows=[...inventoryDom.window.document.querySelectorAll('tbody tr')].filter(row=>row.querySelector('a[href="/sources?item=I_Crit_L001"]'));
    assert.equal(knifeRows.length,1,'one inventory balance per item across refinement stacks');
    assert.equal(knifeRows[0].querySelectorAll('td')[1].textContent,'5');
    assert.match(knifeRows[0].textContent,/3 × level 5.*2 × level 1/);
    report.unequippedInventory.pop();
    await writeFile(reportPath,JSON.stringify(report));
    assert.match(await get('/equipment'),/aria-label="Equip now".*?Trajann.*?Grand Combat Knife.*?Kariyan.*?Grand Combat Knife/s);
    report.unequippedInventory[0].amount=1;
    await writeFile(reportPath,JSON.stringify(report));
    const shopEquipment=await get('/equipment');
    assert.match(shopEquipment,/Shop \/ cost \/ rotation/);
    assert.match(shopEquipment,/War test weapon · level 9/);
    assert.match(shopEquipment,/Equipment upgrade focus/);
    assert.doesNotMatch(await get('/abilities'),/Level eligible now|level eligible<\/small>/);
    assert.match(shopEquipment,/Kariyan.*?Grand Combat Knife.*?(Guild Shop|Crusade Shop|Rogue Trader)/s);
    assert.match(shopEquipment,/UTC/);
    assert.match(shopEquipment,/Random item pool · check stock/);
    const tyrith=catalog.characters.find(character=>character.name==='Tyrith');
    assert.ok(tyrith);
    report.roster.push({...report.roster[0],id:tyrith.id,name:'Tyrith',rarity:'Legendary',progressionIndex:12,items:[{slotId:'Slot1',id:'I_Crit_E010',name:'Adorned Ceremonial Knife',rarity:'Epic',level:1}]});
    report.equipmentAllocation.buyWatch.push({character:'Tyrith',characterId:tyrith.id,slotId:'Slot1',preferredLegendaryItemIds:['I_Crit_L010'],preferredLegendaryItems:['Grand Ceremonial Knife']});
    await writeFile(reportPath,JSON.stringify(report));
    const tyrithPage=await get('/characters/'+tyrith.id);
    assert.match(tyrithPage,/href="\/sources\?item=I_Crit_L010"/);
    assert.match(tyrithPage,/Crusade Shop.*?Daily \(UTC\).*?715 Crusade Credits.*?Random item pool.*?Ad refresh/s);
    const rho=catalog.characters.find(character=>character.name==='Exitor-Rho');
    assert.ok(rho);
    report.roster.push({...report.roster[0],id:rho.id,name:rho.name,faction:'AdeptusMechanicus',rarity:'Legendary',progressionIndex:12,items:[{slotId:'Slot2',id:'I_Defensive_L003',name:'Grand Plated Greaves',rarity:'Legendary',progressionIndex:12,level:1}]});
    report.unequippedInventory.push({id:'I_Defensive_L004',amount:1,level:1});
    await writeFile(reportPath,JSON.stringify(report));
    const rhoPage=await get('/characters/'+rho.id);
    assert.match(rhoPage,/sources\?item=I_Defensive_E004/);
    assert.match(rhoPage,/sources\?item=I_Defensive_L004/);
    assert.match(rhoPage,/Equip Grand Mantle/);
    assert.match(rhoPage,/Inventory copy reserved · level 1/);
    assert.match(await get('/characters/'+rho.id,true),/data-resource-id="I_Defensive_L004".*?<img/s);
    // Shared transfer props include other characters' targets; check this character's rendered recommendations.
    assert.doesNotMatch(rhoPage.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,""),/Fine Mantle|sources\?item=I_Defensive_R004/);
    const abraxas=catalog.characters.find(character=>character.name==='Abraxas');
    report.roster.push({...report.roster[0],id:abraxas.id,name:'Abraxas',faction:'ThousandSons',rarity:'Legendary',progressionIndex:15,items:[{slotId:'Slot2',id:'I_Block_L006',name:'Warpforged Sigil of Corruption',rarity:'Legendary',level:11}]});
    report.unequippedInventory.push({id:'I_Block_L003',amount:1,level:1},{id:'I_Block_E006',amount:2,level:1});
    await writeFile(reportPath,JSON.stringify(report));
    const blockPage=await get('/characters/'+abraxas.id);
    assert.match(blockPage,/Refine Optimal Force Field/);
    assert.match(blockPage,/needs level 9/);
    assert.doesNotMatch(blockPage,/Equip Optimal Force Field/);
    const bellator=catalog.characters.find(character=>character.name==='Bellator');
    const abilityUnit={...report.roster[0],id:bellator.id,name:'Bellator',progressionIndex:15,xpLevel:41,grandAlliance:'Imperial',abilities:[{id:'active',level:41},{id:'passive',level:35}],items:[]};
    report.roster.push(abilityUnit);
    const savedBadges=report.abilityBadges;
    delete report.abilityBadges;
    await writeFile(reportPath,JSON.stringify(report));
    const gatedAbility=await get('/characters/'+bellator.id);
    assert.match(gatedAbility,/Ability upgrades/);
    assert.match(gatedAbility,/Level character to 42/);
    assert.match(gatedAbility,/Target met/);
    assert.match(gatedAbility,/Badges to reach targets/);
    abilityUnit.xpLevel=44;
    await writeFile(reportPath,JSON.stringify(report));
    assert.match(await get('/characters/'+bellator.id),/XP and rarity allow level 42 · sync badges/);
    report.abilityBadges={...savedBadges,Imperial:[{rarity:'Legendary',amount:2}]};
    await writeFile(reportPath,JSON.stringify(report));
    assert.match(await get('/characters/'+bellator.id),/1 Legendary short · 2 owned \/ 3 needed/);
    report.abilityBadges.Imperial[0].amount=3;
    await writeFile(reportPath,JSON.stringify(report));
    const eligibleAbility=await get('/characters/'+bellator.id);
    assert.match(eligibleAbility,/Next level 42 eligible · badges covered/);
    assert.match(eligibleAbility,/Check coins before upgrading/);
    abilityUnit.progressionIndex=9;abilityUnit.abilities[0].level=35;
    await writeFile(reportPath,JSON.stringify(report));
    assert.match(await get('/characters/'+bellator.id),/Ascend to Legendary/);
    abilityUnit.progressionIndex=15;
    await writeFile(reportPath,JSON.stringify(report));
    const cleanout=await get('/inventory-cleanout?scope=owned');
    assert.match(cleanout,/Owned-roster scope/);
    assert.match(cleanout,/Copy and recipient details/);
    assert.match(cleanout,/SITUATIONAL — REVIEW/);
    assert.match(cleanout,/level-1 copies|Level-1 surplus copies/);
    assert.match(cleanout,/lower-chance|Lower block chance/);
    // Automatic saved Raid focus resolves against the current roster on every route.
    for (const name of ['Laviscus', 'Gulgortz', 'Aesoth']) {
        const character = catalog.characters.find(row => row.name === name);
        report.roster.push({ ...report.roster[0], id: character.id, name, rarity: 'Legendary', progressionIndex: 12, rank: 12, xpLevel: 36,
            abilities: [{ id: 'a', level: 36 }, { id: 'p', level: 36 }] });
    }
    await writeFile(reportPath, JSON.stringify(report));
    const autoSave = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boss: 'Mortarion', teamName: 'Big Hit', flex: [], autoFlex: true }) });
    assert.equal(autoSave.status, 200);
    const autoCookie = autoSave.headers.get('set-cookie').split(';')[0];
    const withAutoFocus = async route => {
        const response = await fetch('http://127.0.0.1:3197' + route, { headers: { Cookie: autoCookie } });
        assert.equal(response.status, 200);
        return (await response.text()).replace(/<!--.*?-->/gs, '');
    };
    const battleGuideHtml = await withAutoFocus('/guild-raid');
    assert.match(battleGuideHtml, /Mortarion · Kariyan · Laviscus · Trajann · Gulgortz · Aesoth/);
    const battleDom = new JSDOM(battleGuideHtml);
    const battleGuide = battleDom.window.document.querySelector('[aria-label="Raid battle guide"]');
    assert.ok(battleGuide);
    assert.equal(battleGuide.querySelectorAll('[aria-label^="Show turn "]').length, 6);
    assert.match(battleGuide.querySelector('[aria-label="Turn 1 actions"]').textContent, /Reach legal melee hexes/);
    assert.match(battleGuide.textContent, /summons take double damage/);
    const aesothId = catalog.characters.find(character => character.name === 'Aesoth').id;
    assert.ok(battleGuide.querySelector(`img[src="/characters/${aesothId}.png"]`));
    assert.match(battleGuide.textContent, /Check the matching map and tier for exact hexes/);
    battleDom.window.close();
    const atlacoya = catalog.characters.find(row => row.name === 'Atlacoya');
    report.roster.push({ ...report.roster[0], id: atlacoya.id, name: atlacoya.name, rarity: 'Rare', progressionIndex: 6, rank: 0, xpLevel: 1 });
    report.generatedAt = '2026-10-02T12:00:00.000Z';
    await writeFile(reportPath, JSON.stringify(report));
    const updatedRaid = await withAutoFocus('/guild-raid');
    assert.match(updatedRaid, /Mortarion · Kariyan · Laviscus · Trajann · Gulgortz · Atlacoya/);
    assert.match(updatedRaid, /href="\/characters\/custoAtlacoya"/);
    assert.match(updatedRaid, /Aesoth is absent: no Stand Vigil aura/);
    for (const route of ['/', '/equipment', '/abilities']) {
        assert.match(await withAutoFocus(route), /Mortarion · Kariyan · Laviscus · Trajann · Gulgortz · Atlacoya/);
    }
    console.log('PASS: production routes, report refresh, Mirror Elite planner, multi-rank farming, invalid goal and missing inventory states');

}
finally
{

    if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
    await rm(cwd, { recursive: true, force: true });

}
