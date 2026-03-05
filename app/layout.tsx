import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans, Noto_Serif_Devanagari } from "next/font/google";

import "@/app/globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppProviders } from "@/components/providers/AppProviders";
import { Shell } from "@/components/layout/Shell";

const display = Noto_Serif_Devanagari({
  subsets: ["latin", "devanagari"],
  variable: "--font-display",
  display: "swap",
});

const body = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaaniLedger",
  description: "Voice-first AI financial assistant for small businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body antialiased`}>
        <AppProviders>
          <Shell>
            <AppHeader />
            <main className="mt-6">{children}</main>
          </Shell>
        </AppProviders>
      </body>
    </html>
  );
}
