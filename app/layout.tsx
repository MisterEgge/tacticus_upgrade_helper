import "./globals.css";

export const metadata = {
  title: "Tacticus Upgrade Helper",
  description: "Account-specific Tacticus upgrade dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
