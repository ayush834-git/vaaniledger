"use client";

import { AppNav } from "@/components/layout/AppNav";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export const AppHeader = () => {
  return (
    <header className="sticky top-4 z-40 rounded-xl border border-white/10 bg-surface/80 p-4 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-accent">VaaniLedger</h1>
          <p className="text-xs text-textSecondary">Voice-first AI financial assistant</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <LanguageSwitcher />
          <AppNav />
        </div>
      </div>
    </header>
  );
};