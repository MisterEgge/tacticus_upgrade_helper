import assert from "node:assert/strict";
import test from "node:test";
import { decryptCredential, encryptCredential } from "../src/server/credentialEncryption";

const originalKey = process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY;

test("per-user API credentials encrypt and decrypt with the configured server key", () =>
{

    process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY = "11".repeat(32);
    const encrypted = encryptCredential("private-tacticus-key");
    assert.notEqual(encrypted, "private-tacticus-key");
    assert.equal(decryptCredential(encrypted), "private-tacticus-key");

});

test("credential encryption uses a fresh nonce and rejects tampering", () =>
{

    process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY = "22".repeat(32);
    const first = encryptCredential("same-key");
    const second = encryptCredential("same-key");
    assert.notEqual(first, second);

    const parts = first.split(".");
    parts[3] = Buffer.from("tampered", "utf8").toString("base64url");
    assert.throws(() => decryptCredential(parts.join(".")));

});

test("credential encryption refuses a missing or malformed server key", () =>
{

    delete process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY;
    assert.throws(() => encryptCredential("private-key"), /TACTICUS_CREDENTIAL_ENCRYPTION_KEY/);

});

test.after(() =>
{

    if (originalKey === undefined) delete process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY;
    else process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY = originalKey;

});
