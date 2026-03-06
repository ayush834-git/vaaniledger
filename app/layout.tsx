import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Syne } from "next/font/google";

import "@/app/globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppProviders } from "@/components/providers/AppProviders";
import { Shell } from "@/components/layout/Shell";
import { InstallBanner } from "@/components/pwa/InstallBanner";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaaniLedger — Voice-first AI Finance",
  description: "Voice-first AI financial assistant for small businesses. Speak or type to track income, expenses, and get instant insights.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "VaaniLedger",
    statusBarStyle: "default",
  },
  themeColor: "#FF5500",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <AppProviders>
          <Shell>
            <AppHeader />
            <main className="mt-6">{children}</main>
            <InstallBanner />
          </Shell>
        </AppProviders>
      </body>
    </html>
  );
}
