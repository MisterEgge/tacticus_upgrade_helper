import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AuthAccountHeader from "../app/components/AuthAccountHeader";

test("authenticated header shows the game name instead of email and labels the gear settings link", () => {
    const html = renderToStaticMarkup(createElement(AuthAccountHeader, {
        playerName: "Tacticus Tester"
    }));

    assert.match(html, /<span>Tacticus Tester<\/span>/);
    assert.doesNotMatch(html, /ACCOUNT|email@example\.com|Account settings/);
    assert.match(html, /<a class="authSettingsLink" href="\/settings">.*?<svg aria-hidden="true"/);
    assert.match(html, /<a class="authSettingsLink" href="\/settings">.*?Settings<\/a>/);
    assert.match(html, /Sign out/);
});
