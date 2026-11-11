import { selectedRaidNames } from "../src/domain/raidSelection";
import "./globals.css";
import AccountHeader from "./components/AccountHeader";
import { getReport } from "./lib/report";
import { getMainRaidSelection, getRaidMeta } from "./lib/raidSelection";
import AuthAccountHeader from "./components/AuthAccountHeader";
import { getSupabasePublicConfig } from "../src/server/supabaseConfig";
import { createSupabaseServerClient } from "./lib/supabase/server";

// Account reports are read from disk and change after refresh. Never freeze them at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tacticus Upgrade Helper",
  description: "Account-specific Tacticus upgrade dashboard"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (getSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) console.error("Could not verify account header session.", error.message);
    const { data: account, error: accountError } = user
      ? await supabase.from("user_game_credentials").select("encrypted_api_key,synced_at").eq("user_id", user.id).maybeSingle()
      : { data: null, error: null };
    if (accountError && accountError.code !== "42P01" && accountError.code !== "PGRST205")
      console.error("Could not load account sync status.", accountError.message);
    return <html lang="en"><body><AuthAccountHeader
      {...(user?.email ? { email: user.email } : {})}
      connected={!!account?.encrypted_api_key}
      {...(account?.synced_at ? { lastSynced: account.synced_at } : {})}
    />{children}</body></html>;
  }
  const report = await getReport();
  const meta = await getRaidMeta();
  const raidSelection = await getMainRaidSelection(meta.bosses, report);
  const raidTeam = meta.bosses[raidSelection.boss]![raidSelection.teamName]!;
  return <html lang="en"><body><AccountHeader report={report} raidSelection={raidSelection} raidLineup={selectedRaidNames(raidSelection,raidTeam)}/>{children}</body></html>;
}
