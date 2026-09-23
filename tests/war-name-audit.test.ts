import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

type CatalogCharacter = { id: string; name: string; fullName?: string; shortName?: string };
type Plan = { teams: Array<{ core: string[]; flex: Array<{ name: string }> }>; validatedFullLineups: Array<{ members: string[] }> };

test("every War source alias has stable-ID proof and every configured name is canonical", () =>
{
    const catalog = JSON.parse(fs.readFileSync("data/character_catalog.json", "utf8")) as { characters: CatalogCharacter[] };
    const aliases = JSON.parse(fs.readFileSync("config/war_character_aliases.json", "utf8")) as Record<string, { canonical: string; sourceId: string }>;
    const byId = new Map(catalog.characters.map((character) => [character.id, character]));
    const names = new Set(catalog.characters.flatMap((character) => [character.name, character.fullName, character.shortName].filter((name): name is string => !!name)));
    for (const [sourceName, alias] of Object.entries(aliases).filter(([sourceName]) => !sourceName.startsWith("_")))
    {
        const character = byId.get(alias.sourceId);
        assert.ok(character, `${sourceName} must cite a real catalog ID`);
        assert.equal(character.name, alias.canonical, `${sourceName} canonical name must come from its catalog ID`);
    }
    for (const path of ["config/war_defense_teams.json", "config/war_offense_teams.json"])
    {
        const plan = JSON.parse(fs.readFileSync(path, "utf8")) as Plan;
        const used = new Set([...plan.teams.flatMap((team) => [...team.core, ...team.flex.map((member) => member.name)]), ...plan.validatedFullLineups.flatMap((team) => team.members)]);
        for (const name of used) assert.ok(names.has(name), `${path} has no canonical catalog match for ${name}`);
        for (const alias of Object.keys(aliases).filter((alias) => !alias.startsWith("_"))) assert.ok(!used.has(alias), `${path} must store canonical names, not ${alias}`);
    }
});
