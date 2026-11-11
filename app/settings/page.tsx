import { redirect } from "next/navigation";
import Nav from "../components/Nav";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { getSupabasePublicConfig } from "../../src/server/supabaseConfig";
import TacticusApiKeyForm from "../components/TacticusApiKeyForm";
import SyncAccountButton from "../components/SyncAccountButton";

export default async function AccountSettings()
{

    if (!getSupabasePublicConfig()) redirect("/");
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) console.error("Could not verify account settings session.", error.message);
    if (!user) redirect("/login");
    const { data: credential, error: credentialError } = await supabase
        .from("user_game_credentials")
        .select("user_id,synced_at")
        .eq("user_id", user.id)
        .maybeSingle();
    const storageReady = !credentialError;
    if (credentialError && credentialError.code !== "42P01" && credentialError.code !== "PGRST205")
        console.error("Could not load Tacticus API credential status.", credentialError.message);

    return <main>
        <Nav/>
        <header><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Account settings</h1><p className="sub">Manage sign-in and your private Tacticus account.</p></div></header>
        <section className="panel accountSettingsPanel">
            <h2>Sign-in</h2>
            <dl><div><dt>Email</dt><dd>{user.email ?? "Not provided"}</dd></div><div><dt>Account created</dt><dd>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</dd></div></dl>
        </section>
        <section className="panel accountSettingsPanel apiConnectionPanel">
            <p className="eyebrow">ACCOUNT DATA</p><h2>Connect your Tacticus API</h2>
            <p className="sub">Connect a key to this account. It is verified against Tacticus and stored encrypted for your account only.</p>
            <TacticusApiKeyForm connected={!!credential} storageReady={storageReady}/>
            {credential ? <div className="accountSyncPanel"><h3>Account data</h3><p className="sub">Sync your roster and resources to open your private planning pages.</p><SyncAccountButton {...(credential.synced_at ? { lastSynced: credential.synced_at } : {})}/></div> : null}
        </section>
    </main>;

}
