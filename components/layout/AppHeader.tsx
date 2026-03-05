"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { AppNav } from "@/components/layout/AppNav";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";

export const AppHeader = () => {
  const { status, data } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-4 z-40 rounded-xl border border-white/10 bg-surface/80 p-4 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-accent">VaaniLedger</h1>
          <p className="text-xs text-textSecondary">Voice-first AI financial assistant</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <p className="max-w-[200px] truncate text-xs text-textSecondary">{data?.user?.email ?? "Signed in"}</p>
                <Button
                  onClick={() => signOut({ callbackUrl: "/auth" })}
                  type="button"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link
                href="/auth"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-accent px-3 text-xs font-medium text-bg transition hover:brightness-110"
              >
                Login
              </Link>
            )}
          </div>
          <LanguageSwitcher />
          <AppNav />
        </div>
      </div>
    </header>
  );
};
