"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { encryptCredential } from "../../src/server/credentialEncryption";

export type GameAccountActionState = { error?: string; message?: string };

function migrationMessage(): string
{

    return "Account storage is not ready yet. Run the Tacticus API credential migration in Supabase SQL Editor, then try again.";

}

function isMissingCredentialsTable(error: { code?: string }): boolean
{

    return error.code === "42P01" || error.code === "PGRST205";

}

export async function saveTacticusApiKeyAction(_previous: GameAccountActionState, formData: FormData): Promise<GameAccountActionState>
{

    const apiKey = String(formData.get("apiKey") ?? "").trim();
    if (!apiKey || apiKey.length > 2048) return { error: "Enter a valid Tacticus API key." };

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Your session has expired. Sign in again." };

    let response: Response;
    try
    {

        response = await fetch("https://api.tacticusgame.com/api/v1/player", {
            headers: { "X-API-Key": apiKey },
            signal: AbortSignal.timeout(15_000)
        });

    }
    catch
    {

        return { error: "Could not reach the Tacticus API. Check your connection and try again." };

    }
    if (response.status === 401 || response.status === 403) return { error: "Tacticus rejected that API key. Check it and try again." };
    if (!response.ok) return { error: `Tacticus could not verify the key (HTTP ${response.status}). Try again later.` };

    let encryptedApiKey: string;
    try
    {

        encryptedApiKey = encryptCredential(apiKey);

    }
    catch (error)
    {

        console.error("Could not encrypt a Tacticus API credential.", error);
        return { error: "Secure API-key storage is not configured on this server." };

    }

    const { error } = await supabase.from("user_game_credentials").upsert({
        user_id: user.id,
        encrypted_api_key: encryptedApiKey,
        report_data: null,
        synced_at: null,
        updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error)
    {

        if (isMissingCredentialsTable(error)) return { error: migrationMessage() };
        console.error("Could not save an encrypted Tacticus API credential.", error.message);
        return { error: "Could not save the API key. Check the Supabase database setup and try again." };

    }

    revalidatePath("/settings");
    return { message: "Tacticus API key verified and saved securely. Sync your account to load your roster." };

}

export async function removeTacticusApiKeyAction(_previous: GameAccountActionState, _formData: FormData): Promise<GameAccountActionState>
{

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Your session has expired. Sign in again." };

    const { error } = await supabase.from("user_game_credentials").delete().eq("user_id", user.id);
    if (error)
    {

        if (isMissingCredentialsTable(error)) return { error: migrationMessage() };
        console.error("Could not remove a Tacticus API credential.", error.message);
        return { error: "Could not remove the API key. Try again." };

    }

    revalidatePath("/settings");
    return { message: "Tacticus API key removed." };

}
