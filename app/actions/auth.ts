"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";

export type AuthActionState = { error?: string; message?: string };

function safeNextPath(value: FormDataEntryValue | null): string
{

    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/settings";
    return value;

}

async function siteUrl(): Promise<string>
{

    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (configured)
    {

        const parsed = new URL(configured);
        if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS.");
        return parsed.origin;

    }
    if (process.env.NODE_ENV === "development") return "http://localhost:3000";
    throw new Error("Set NEXT_PUBLIC_SITE_URL to the deployed HTTPS origin for verification and password-reset links.");

}

export async function signInAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState>
{

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return { error: "Enter your email and password." };
    try
    {

        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };

    }
    catch (error)
    {

        return { error: error instanceof Error ? error.message : "Could not sign in." };

    }
    redirect(safeNextPath(formData.get("next")));

}

export async function signUpAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState>
{

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("passwordConfirmation") ?? "");
    if (!email || !password) return { error: "Enter your email and password." };
    if (password.length < 12) return { error: "Use a password with at least 12 characters." };
    if (password !== confirmation) return { error: "The passwords do not match." };
    let hasSession = false;
    try
    {

        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: new URL("/auth/callback?next=/settings", await siteUrl()).toString() }
        });
        if (error) return { error: error.message };
        hasSession = !!data.session;

    }
    catch (error)
    {

        return { error: error instanceof Error ? error.message : "Could not create the account." };

    }
    if (hasSession) redirect("/settings");
    return { message: "If the address can be registered, a verification link has been sent. Check your inbox to continue." };

}

export async function sendPasswordResetAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState>
{

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return { error: "Enter your email address." };
    try
    {

        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: new URL("/auth/callback?next=/reset-password", await siteUrl()).toString()
        });
        if (error) return { error: error.message };

    }
    catch (error)
    {

        return { error: error instanceof Error ? error.message : "Could not request a password reset." };

    }
    return { message: "If an account exists for that address, a password-reset link has been sent." };

}

export async function updatePasswordAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState>
{

    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("passwordConfirmation") ?? "");
    if (password.length < 12) return { error: "Use a password with at least 12 characters." };
    if (password !== confirmation) return { error: "The passwords do not match." };
    try
    {

        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "The reset link is invalid or expired. Request a new one." };
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { error: error.message };

    }
    catch (error)
    {

        return { error: error instanceof Error ? error.message : "Could not update the password." };

    }
    redirect("/settings");

}

export async function signOutAction()
{

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Could not sign out: ${error.message}`);
    redirect("/login");

}
