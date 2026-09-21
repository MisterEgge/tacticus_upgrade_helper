import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let syncInProgress = false;

function refreshAccount(): Promise<void>
{

    return new Promise((resolve, reject) =>
    {

        const npm = process.platform === "win32" ? "npm.cmd" : "npm";
        const child = spawn(npm, ["run", "refresh"], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        child.stderr.on("data", chunk => { stderr += String(chunk); });
        child.on("error", reject);
        child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Account refresh exited with code ${code}`)));

    });

}

export async function POST()
{

    if (syncInProgress) return NextResponse.json({ ok: false, error: "Account sync is already running." }, { status: 409 });
    syncInProgress = true;
    try
    {

        await refreshAccount();
        return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });

    }
    catch (error)
    {

        console.error("Account sync failed", error);
        return NextResponse.json({ ok: false, error: "Account sync failed. Check the server API configuration and logs." }, { status: 500 });

    }
    finally
    {

        syncInProgress = false;

    }

}
