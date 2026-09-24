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

## Dashboard development

Use Node 24 and `npm ci`. Set `TACTICUS_API_KEY` in a local `.env`, then run
`npm run refresh` and `npm run dev`. Account data is read on each request, so a
production server picks up refreshed reports without rebuilding. A missing export
or API key is not replaced with demonstration or historical account values.

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
