// Production HTTP smoke test. Fixtures live only in a temporary directory;
// never overwrite the user's player export, report, or history.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, rm, readFile } from 'node:fs/promises';
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

    for (const name of ['.next', 'node_modules', 'public', 'data', 'config', 'next.config.ts']) await symlink(path.join(root, name), path.join(cwd, name));
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
    assert.match(await get('/abilities'), /Uncommon: \? owned/);
    assert.match(await get('/orbs'), /Orb inventory unavailable/);
    report.roster[0].shards = 40;
    report.orbInventory = { Xenos: [{ rarity: 'Uncommon', amount: 7 }] };
    await writeFile(reportPath, JSON.stringify(report));
    assert.equal(JSON.parse(await get('/api/sync')).lastSynced, report.generatedAt);
    const orbs = await get('/orbs');
    assert.match(orbs, /Orb priorities/);
    assert.match(orbs, /Xenos · Uncommon<\/strong><\/td><td>7<\/td><td>10<\/td><td><strong>3/);
    assert.doesNotMatch(orbs, /Synthetic excluded unit/);
    report.roster[0] = { ...report.roster[0], progressionIndex: 8, shards: 50, rarity: 'Rare' };
    report.orbInventory = { Xenos: [{ rarity: 'Epic', amount: 4 }] };
    await writeFile(reportPath, JSON.stringify(report));
    const readyOrbs = await get('/orbs');
    assert.match(readyOrbs, /Shard-ready orb shopping list/);
    assert.match(readyOrbs, /aria-label="Epic shard-ready orb totals".*?Xenos · Epic<\/strong><\/td><td>4<\/td><td>10<\/td><td><strong>6/s);
    assert.match(readyOrbs, /aria-label="Epic shard-ready character upgrades".*?Aleph-Null.*?Ascend to Epic.*?Collect 6 more orbs/s);
    const honor = await get('/onslaught');
    assert.match(honor, /Onslaught honor priorities/);
    assert.match(honor, /aria-label="Xenos honor priorities".*?Aleph-Null.*?Farm Epic orbs: 6 short/s);
    assert.match(honor, /one regenerates every 16 hours/);
    assert.match(honor, /Imperial · top 0/);
    assert.match(await get('/onslaught', true), /data-resource-id="onslaughtToken".*?<img/s);
    const forcas = { ...report.roster[0], id: 'darkaCompanion', name: 'Forcas', faction: 'DarkAngels', grandAlliance: 'Imperial', shards: 45 };
    report.roster.push(forcas);
    report.orbInventory.Imperial = [{ rarity: 'Epic', amount: 0 }];
    await writeFile(reportPath, JSON.stringify(report));
    const shardBlocked = await get('/orbs');
    const blockedDom = new JSDOM(shardBlocked);
    assert.equal(blockedDom.window.document.querySelector('a[href="/characters/darkaCompanion"]'), null);
    blockedDom.window.close();
    const forcasDetail = await get('/characters/darkaCompanion');
    assert.match(forcasDetail, /Collect shards for Epic/);
    assert.match(forcasDetail, /5 regular shards short · 45 \/ 50 owned/);
    assert.doesNotMatch(forcasDetail, /Orb totals and stores/);
    forcas.shards = 50;
    await writeFile(reportPath, JSON.stringify(report));
    const unblocked = new JSDOM(await get('/orbs'));
    const epicGroup = unblocked.window.document.querySelector('[aria-label="Epic orbs"]');
    assert.ok(epicGroup?.querySelector('a[href="/characters/darkaCompanion"]'));
    assert.match(epicGroup.textContent, /10 Imperial Epic/);
    unblocked.window.close();
    report.roster.pop();
    delete report.orbInventory.Imperial;
    report.roster[0] = { ...report.roster[0], progressionIndex: 9, shards: 0, rarity: 'Epic' };
    report.orbInventory = { Xenos: [{ rarity: 'Epic', amount: 0 }] };
    await writeFile(reportPath, JSON.stringify(report));
    assert.doesNotMatch(await get('/orbs'), /aria-label="Epic shard-ready character upgrades"/);
    report.abilityBadges = { Xenos: [{ rarity: 'Uncommon', amount: 7 }] };
    await writeFile(reportPath, JSON.stringify(report));
    assert.match(await get('/abilities'), /Uncommon: 7 owned/);
    const campaigns = await get('/campaigns');
    assert.match(campaigns, /Indomitus Mirror Elite/);
    assert.match(campaigns, /Stone I/);
    assert.match(campaigns, /<h2>Indomitus Mirror Elite<\/h2>.*?class="power">38/s);
    assert.match(campaigns, /Elite 3★ Upgrade Planner/);
    assert.match(campaigns, /class="campaignInvestmentGroup"><button type="button" class="campaignSectionToggle" aria-expanded="true" aria-controls="[^"]+"><h3>Indomitus Mirror Elite<\/h3>/);
    assert.match(campaigns, /class="campaignSectionToggle" aria-expanded="true" aria-controls="[^"]+".*?Account-specific campaign priorities/s);
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
    for (const route of ['/', '/equipment', '/equipment-demand', '/abilities', '/orbs', '/ratings', '/characters', '/characters/necroSpyder', '/inventory', '/guild-raid', '/war-defense'])
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
    assert.match(selectedHtml, /Ad-Mech vs Riptide/);
    assert.match(selectedHtml, /5\/5 owned characters \+ 1 Machine of War/);
    assert.match(selectedHtml, /Machine of War plan/);
    assert.match(selectedHtml, /Anuphet.*?Plan rank materials/s);
    const selectedRows = selectedHtml.match(/<tbody>(.*?)<\/tbody>/s)?.[1];
    assert.ok(selectedRows);
    assert.doesNotMatch(selectedRows, /Trajann|Vitruvius|Galatian/);
    assert.match(selectedRows, /Anuphet/);
    const unowned = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, machine: 'Biovore' }) });
    assert.equal(unowned.status, 400);
    const forbidden = await fetch('http://127.0.0.1:3197/api/raid-selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, lineup: [...raidNames.slice(0, 4), 'Trajann'], flex: ['Gulgortz', 'Trajann'] }) });
    assert.equal(forbidden.status, 400);
    report.roster = originalRoster;
    await writeFile(reportPath, JSON.stringify(report));
    const roadmap = await get('/guild-raid');
    assert.match(roadmap, /RAID BUILD ORDER/);
    assert.match(roadmap, /5 character slots still unfilled/);
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
    assert.match(completion, /current character catalog through Adamantine II/);
    assert.match(completion, /Engram Neurochip/);
    assert.match(completion, /Done for owned roster/);
    assert.match(completion, /Unowned demand/);
    assert.doesNotMatch(completion, /Unknown future recipe/);
    assert.match(await get('/material-completion?target=17'), /current character catalog through Diamond III/);
    assert.match(await get('/material-completion?target=999'), /Choose a supported rank ceiling/);
    const eliteGaps = await get('/elite-farming-gaps');
    assert.match(eliteGaps, /Elite Farming Gaps/);
    assert.match(eliteGaps, /Campaign unlock opportunities/);
    assert.match(eliteGaps, /Include Mythic materials/);
    assert.doesNotMatch(eliteGaps, /type="checkbox" name="mythic"[^>]*checked/);
    assert.doesNotMatch(eliteGaps, /<small>Mythic<\/small>/);
    assert.match(await get('/elite-farming-gaps?mythic=1'), /<small>Mythic<\/small>/);
    assert.match(eliteGaps, /Unknown|No Elite source in synced data/);
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
    const lineup = await get('/war-defense');
    assert.match(lineup, /class="warTeamTitle"[^>]*>Imospekh \/ Aleph-Null \/ Makhotep \/ Thutmose \/ Anuphet/);
    assert.match(lineup, /class="warTeamPortraits"[^>]*>.*?alt="Imospekh".*?alt="Makhotep"/s);
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
    await writeFile(reportPath,JSON.stringify(report));
    assert.match(await get('/equipment'),/aria-label="Equip now".*?Trajann.*?Grand Combat Knife.*?Kariyan.*?Grand Combat Knife/s);
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
    assert.doesNotMatch(rhoPage,/Fine Mantle|sources\?item=I_Defensive_R004/);
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
    assert.match(gatedAbility,/Practical target met · no further upgrade required/);
    assert.match(gatedAbility,/Badges to practical targets/);
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
    assert.match(await withAutoFocus('/guild-raid'), /Mortarion · Kariyan · Laviscus · Trajann · Gulgortz · Aesoth/);
    const atlacoya = catalog.characters.find(row => row.name === 'Atlacoya');
    report.roster.push({ ...report.roster[0], id: atlacoya.id, name: atlacoya.name, rarity: 'Rare', progressionIndex: 6, rank: 0, xpLevel: 1 });
    report.generatedAt = '2026-10-02T12:00:00.000Z';
    await writeFile(reportPath, JSON.stringify(report));
    const updatedRaid = await withAutoFocus('/guild-raid');
    assert.match(updatedRaid, /Mortarion · Kariyan · Laviscus · Trajann · Gulgortz · Atlacoya/);
    assert.match(updatedRaid, /href="\/characters\/custoAtlacoya"/);
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
