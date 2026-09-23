import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("campaign display uses the shared rank formatter", async () =>
{
    const page = await readFile(new URL("../app/campaigns/page.tsx", import.meta.url), "utf8");

    assert.match(page, /rankName\(unit\.rank\)/);
    assert.doesNotMatch(page, /rankNames\[/);
});
