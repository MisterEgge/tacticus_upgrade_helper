import "./globals.css";
import AccountHeader from "./components/AccountHeader";
import { getReport } from "./lib/report";
import { getMainRaidSelection, getRaidMeta } from "./lib/raidSelection";

// Account reports are read from disk and change after refresh. Never freeze them at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tacticus Upgrade Helper",
  description: "Account-specific Tacticus upgrade dashboard"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const report = await getReport();
  const meta = await getRaidMeta();
  const raidSelection = await getMainRaidSelection(meta.bosses, report);
  const raidTeam = meta.bosses[raidSelection.boss]![raidSelection.teamName]!;
  return <html lang="en"><body><AccountHeader report={report} raidSelection={raidSelection} raidLineup={[...raidTeam.core, ...raidSelection.flex]}/>{children}</body></html>;
}
