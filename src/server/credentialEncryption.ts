import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function encryptionKey(): Buffer
{

    const value = process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY?.trim();
    if (!value || !/^[\da-f]{64}$/i.test(value)) throw new Error("TACTICUS_CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hexadecimal key.");
    return Buffer.from(value, "hex");

}

export function encryptCredential(plaintext: string): string
{

    const iv = randomBytes(12);
    const cipher = createCipheriv(algorithm, encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");

}

export function decryptCredential(value: string): string
{

    const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = value.split(".");
    if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra.length) throw new Error("Stored credential has an unsupported format.");
    const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");

}
