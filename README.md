# Tacticus Upgrade Helper

Account-specific upgrade analysis for **Warhammer 40,000: Tacticus**.

The tool reads an official Tacticus `player.json` export and generates:
- a Legendary equipment shopping watchlist,
- ability-level priorities,
- an Uncommon-badge queue for abilities below level 17,
- account-specific recommendations driven by character value rather than rarity alone.

## Quick start

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt

python src/build_report.py data/player.json
```

`npm run refresh` fetches the latest player snapshot and writes `output/upgrade-report.json`. The existing Python workbook generator remains available while the report logic is migrated into TypeScript.

## Data model

`player.json`, Guild data, and generated reports are account state. This is a personal-use repository, so they may be committed to keep the site portable and current. The API key itself remains in `.env` and is never committed.

Maintained recommendation data lives under `config/`:
- `character_priorities.json` — account/value weighting and notes.
- `ability_targets.json` — researched active/passive targets and confidence/source.
- `equipment_watchlist.json` — exact desired Legendary items and intended recipients.

This separation lets a new player export regenerate the report without rewriting the recommendation engine.

## Current policy

- Newly unlocked abilities are assumed to be raised to level 9 immediately.
- The current badge project is to bring useful abilities through the **Uncommon tier to level 17**.
- Garbage/low-value abilities may be deferred.
- Legendary equipment is allocated to the highest-value compatible character, not blindly to any under-rarity slot.
- Scarce inventory is never counted twice.

## Account sync

`npm run refresh` fetches Player, Guild, and Guild Raid data. Guild Raid hero details provide the latest observed per-character raid power when the Player API response supplies the account user ID.

The running app automatically refreshes once per Central calendar day at **4:00 a.m. America/Chicago**, including daylight saving changes. If the server starts after a missed cutoff, it catches up immediately. A manual sync after the cutoff satisfies that day. Failed runs retry after 15 minutes. Manual and scheduled requests share a lock within the Node server, and reports are replaced atomically after successful analysis. Open pages check sync status every minute and on window focus, then reload their account data after a completed sync.

Automatic sync needs `TACTICUS_API_KEY` in the server environment or local `.env` and a running Node server. Set `TACTICUS_AUTO_SYNC=false` and restart to disable it; the manual button remains available. The header shows whether auto-sync is enabled. A stopped or sleeping PC cannot run local sync; it catches up when resumed or started. Deployments that freeze serverless instances need an external scheduler instead of this in-process timer. Multiple independent server replicas require shared coordination.

GitHub also schedules the existing analysis workflow at 4 a.m. Central using the repository API-key secret. It runs the full refresh and saves the report artifact; it does not overwrite the local app’s files or commit account data. GitHub may queue scheduled runs past their nominal start time. The local server remains responsible for the displayed app data.

The requested time is independent of the game’s daily reset (midnight UTC: 7 p.m. CDT / 6 p.m. CST).

### Material completion

Resources → Material completion shows lifetime upgrade demand through a selected rank ceiling (Adamantine II by default). It includes nested crafting ingredients, skips equipped slots, and shares finished/intermediate/base inventory once across the owned roster. Search by material or recipient and filter for finished materials, stocked requirements, shortages, or unowned users.

“Done — owned” means no remaining owned-character uses through the ceiling; “Done — catalog” also has no unowned-character uses in the synced catalog. “Stocked” means inventory covers remaining uses. New characters, future ranks, Machines of War and other sinks remain outside this calculation. Unknown progress or recipes cannot prove completion; unallocated inventory is not a salvage recommendation.

### Elite farming gaps

Resources → Elite farming gaps lists every farmable upgrade material without a confirmed unlocked Elite source. Any unlocked Elite alternative removes the material. Locked nodes, unknown progress, and absent Elite sources are separate states. Mythic materials are hidden by default; stocked/finished materials can also be hidden. The selected rank ceiling controls owned demand, while the source audit always covers the full synced material catalog.

Campaign opportunities show each material's earliest locked Elite unlock and compare expected farming energy with the best confirmed unlocked alternative. Each campaign is an independent option, so overlapping savings cannot be added together. Estimates exclude campaign-clear energy, character investment and daily attempt limits. Unknown coverage/demand never produces a guessed campaign recommendation.

## Dashboard development

Use Node 24 and `npm ci`. Set `TACTICUS_API_KEY` in a local `.env`, then run
`npm run refresh` and `npm run dev`. Account data is read on each request, so a
production server picks up refreshed reports without rebuilding. A missing export
or API key is not replaced with demonstration or historical account values.

### Automatic local updates on Windows

After getting the latest scripts once, run this in the **VS Code PowerShell terminal**
from your local repository folder:

```powershell
git switch main
git pull --ff-only origin main
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-auto-pull.ps1
```

This installs a Windows task that checks every two minutes while you are signed
in. It updates **only local `main`**, using `git pull --ff-only`; it never
switches branches, commits changes, discards edits, or merges into a feature
branch. Git preserves unrelated local edits and refuses an update that would
overwrite them. VS Code sees updated files automatically. The task uses the Windows
certificate store for Git HTTPS verification; it does not disable SSL checks.

To pause or resume auto-pull, run either command in PowerShell. Pausing keeps
the task and its settings, and does not stop a pull already in progress:

```powershell
Disable-ScheduledTask -TaskName 'Tacticus Upgrade Helper - Auto Pull Main'
Enable-ScheduledTask -TaskName 'Tacticus Upgrade Helper - Auto Pull Main'
```

To change the interval, run the installer again from the repository folder.
For example, check every 15 minutes:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-auto-pull.ps1 -IntervalMinutes 15
```

The installer accepts 1–1440 minutes and runs one pull immediately. Reinstalling
also enables the task; use the pause command afterward if you want it off.
Check its current state with
`Get-ScheduledTask -TaskName 'Tacticus Upgrade Helper - Auto Pull Main'`.

If the one-time pull fails with a certificate error, set the Windows TLS backend
for this checkout and retry:

```powershell
git config --local http.sslBackend schannel
git pull --ff-only origin main
```

If the certificate is not trusted by Windows, it must be installed into the
Windows trust store by whoever manages that certificate. The scheduled task
records successful updates and failures in
`$env:LOCALAPPDATA\TacticusUpgradeHelper\auto-pull.log`. It quietly skips a
branch other than `main`. Remove the task with
`Unregister-ScheduledTask -TaskName 'Tacticus Upgrade Helper - Auto Pull Main' -Confirm:$false`.

Validation (no account key required):

```bash
npm test
npm run typecheck
npm run build
npm run test:smoke
python -m pytest -q
```

Install `pytest` and `requirements.txt` for the existing Python tests. The HTTP
smoke test uses a labeled synthetic fixture in an isolated temporary directory;
it never writes to the real account export or report. CI runs both test suites,
typecheck, production build, and HTTP smoke checks before account analysis.

The Farming page accepts a character and target rank. It excludes upgrades
already equipped at the current rank, consumes finished/intermediate materials
before expanding recipes, and shares one inventory ledger across all goals.
Missing inventory, slot data, or recipes produces an explicit unavailable state.
Accessible farming battles are not necessarily eligible for raids.

Campaign snapshots are local under `data/history/campaigns/`. Schema v2 preserves
changed roster/progression observations and records advances separately. The
first observation is a baseline, not a recent clear. Previous schema snapshots
remain untouched; their character matching may be unreliable. No snapshot proves
which upgrade caused a clear or establishes three-star completion. Campaign
targets without campaign-specific evidence remain under research.
