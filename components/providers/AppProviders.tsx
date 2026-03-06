"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/provider";
import { MicProvider } from "@/lib/context/MicContext";

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <SessionProvider>
      <I18nProvider>
        <MicProvider>{children}</MicProvider>
      </I18nProvider>
    </SessionProvider>
  );
};

