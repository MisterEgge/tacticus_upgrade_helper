import "./globals.css";

// Account reports are read from disk and change after refresh. Never freeze them at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tacticus Upgrade Helper",
  description: "Account-specific Tacticus upgrade dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
