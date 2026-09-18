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

The generated workbook is written to `output/Tacticus_Upgrade_Priorities.xlsx`.

## Data model

`player.json` is **account state**, not recommendation data. It is intentionally gitignored.

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

## Safety

Do not commit real `player.json` exports. They are excluded by `.gitignore`.
