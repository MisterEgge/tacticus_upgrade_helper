import { exec } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execAsync = promisify(exec);
let syncInProgress = false;

async function runScript(script: string): Promise<void>
{

    await execAsync(`npx tsx ${script}`, { cwd: process.cwd(), env: process.env, maxBuffer: 10 * 1024 * 1024 });

}

async function refreshAccount(): Promise<void>
{

    await runScript("src/fetchPlayer.ts");
    await runScript("src/fetchGuildData.ts");
    await runScript("src/snapshotCampaignProgress.ts");
    await runScript("src/analyzePlayer.ts");

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
        const detail = error instanceof Error ? error.message : "Unknown sync error";
        return NextResponse.json({ ok: false, error: process.env.NODE_ENV === "development" ? `Account sync failed: ${detail}` : "Account sync failed. Check the server logs." }, { status: 500 });

    }
    finally
    {

        syncInProgress = false;

    }

}
