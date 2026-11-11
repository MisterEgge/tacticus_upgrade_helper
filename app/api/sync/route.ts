import { NextResponse } from "next/server";
import { buildPlayerReport, type PlayerResponse } from "../../../src/analyzePlayer";
import { decryptCredential } from "../../../src/server/credentialEncryption";
import { isSupabaseAuthEnabled } from "../../../src/server/supabaseConfig";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { refreshAccount, syncStatus, SyncAlreadyRunningError } from "../../../src/server/accountSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200): NextResponse
{

    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

}

function missingCredentialsTable(error: { code?: string }): boolean
{

    return error.code === "42P01" || error.code === "PGRST205";

}

function isPlayerResponse(value: unknown): value is PlayerResponse
{

    if (!value || typeof value !== "object") return false;
    const root = value as Partial<PlayerResponse>;
    return !!root.metaData
        && typeof root.metaData.configHash === "string"
        && typeof root.metaData.lastUpdatedOn === "number"
        && !!root.player
        && !!root.player.details
        && typeof root.player.details.name === "string"
        && typeof root.player.details.powerLevel === "number"
        && Array.isArray(root.player.units)
        && root.player.units.every(unit => typeof unit.id === "string" && typeof unit.progressionIndex === "number" && Array.isArray(unit.abilities) && Array.isArray(unit.items))
        && !!root.player.inventory
        && Array.isArray(root.player.inventory.items);

}

async function authenticatedCredential(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>)
{

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) return { response: json({ ok: false, error: "Could not verify your account session." }, 401) };
    if (!user) return { response: json({ ok: false, error: "Sign in to sync your account." }, 401) };

    const { data, error } = await supabase
        .from("user_game_credentials")
        .select("encrypted_api_key,synced_at")
        .eq("user_id", user.id)
        .maybeSingle();
    if (error)
    {

        if (missingCredentialsTable(error)) return { response: json({ ok: false, error: "Run the Tacticus API credential migration in Supabase SQL Editor first." }, 503) };
        console.error("Could not load the signed-in user's Tacticus credential.", error.message);
        return { response: json({ ok: false, error: "Could not load this account's API-key settings." }, 500) };

    }

    return { user, credential: data };

}

export async function GET()
{

    if (!isSupabaseAuthEnabled()) return json(await syncStatus());

    const supabase = await createSupabaseServerClient();
    const result = await authenticatedCredential(supabase);
    if ("response" in result) return result.response;
    return json({
        automatic: false,
        configured: !!result.credential?.encrypted_api_key,
        running: false,
        timezone: "America/Chicago",
        hour: 4,
        nextScheduledAt: null,
        lastSynced: result.credential?.synced_at ?? null,
        error: null
    });

}

export async function POST()
{

    if (!isSupabaseAuthEnabled())
    {

        try { return json({ ok: true, syncedAt: await refreshAccount() }); }
        catch (error)
        {

            if (error instanceof SyncAlreadyRunningError) return json({ ok: false, error: error.message }, 409);
            console.error("Account sync failed");
            return json({ ok: false, error: "Account sync failed. Check the API key and server logs." }, 500);

        }

    }

    const supabase = await createSupabaseServerClient();
    const result = await authenticatedCredential(supabase);
    if ("response" in result) return result.response;
    const { user, credential } = result;
    if (!credential?.encrypted_api_key) return json({ ok: false, error: "Connect your Tacticus API key in Account settings first." }, 409);

    let apiKey: string;
    try { apiKey = decryptCredential(credential.encrypted_api_key); }
    catch (error)
    {

        console.error("Could not decrypt a Tacticus API credential.", error);
        return json({ ok: false, error: "Secure API-key storage is unavailable. Contact the app administrator." }, 500);

    }

    let response: Response;
    try
    {

        response = await fetch("https://api.tacticusgame.com/api/v1/player", {
            headers: { "X-API-Key": apiKey },
            signal: AbortSignal.timeout(30_000)
        });

    }
    catch
    {

        return json({ ok: false, error: "Could not reach the Tacticus API. Try syncing again." }, 502);

    }
    if (response.status === 401 || response.status === 403) return json({ ok: false, error: "Tacticus rejected the saved API key. Replace it in Account settings." }, 401);
    if (!response.ok) return json({ ok: false, error: `Tacticus account sync failed (HTTP ${response.status}). Try again later.` }, 502);

    let payload: unknown;
    try { payload = await response.json(); }
    catch { return json({ ok: false, error: "Tacticus returned invalid account data." }, 502); }
    if (!isPlayerResponse(payload)) return json({ ok: false, error: "Tacticus returned account data in an unsupported format." }, 502);

    let report: Awaited<ReturnType<typeof buildPlayerReport>>;
    try { report = await buildPlayerReport(payload); }
    catch (error)
    {

        console.error("Could not generate an account report.", error);
        return json({ ok: false, error: "Could not analyze this account. Try again later." }, 500);

    }

    const syncedAt = new Date().toISOString();
    const { error } = await supabase.from("user_game_credentials").update({
        report_data: report,
        synced_at: syncedAt,
        updated_at: syncedAt
    }).eq("user_id", user.id);
    if (error)
    {

        console.error("Could not save an account-specific report.", error.message);
        return json({ ok: false, error: "Could not save this account's report. Try again." }, 500);

    }

    return json({ ok: true, syncedAt });

}
