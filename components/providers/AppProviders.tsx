"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/provider";

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <SessionProvider>
      <I18nProvider>{children}</I18nProvider>
    </SessionProvider>
  );
};

