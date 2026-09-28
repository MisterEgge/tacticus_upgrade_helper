import "./globals.css";
import AccountHeader from "./components/AccountHeader";
import { getReport } from "./lib/report";

// Account reports are read from disk and change after refresh. Never freeze them at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tacticus Upgrade Helper",
  description: "Account-specific Tacticus upgrade dashboard"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const report = await getReport();
  return <html lang="en"><body><AccountHeader report={report}/>{children}</body></html>;
}
