"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/ledger", labelKey: "nav.ledger" },
];

export const AppHeader = () => {
  const pathname = usePathname();
  const { status, data } = useSession();
  const { t } = useTranslation();

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className="sticky top-3 z-50 mx-auto max-w-7xl rounded-2xl border border-white/10 bg-[#0A0F1E]/80 px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
    >
      {/* Live data pulse bar */}
      <div className="absolute top-0 left-0 h-[2px] w-full overflow-hidden rounded-t-2xl">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/30">
            <span className="text-xs font-bold font-mono text-amber-400">VL</span>
          </div>
          <div>
            <span className="font-display text-lg font-bold text-amber-400 tracking-tight">VaaniLedger</span>
            <span className="ml-2 hidden text-[10px] text-slate-500 md:inline">voice-first finance</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="relative px-4 py-2 text-sm font-medium transition-colors">
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-amber-400/10 border border-amber-400/20"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={isActive ? "text-amber-400 relative z-10" : "text-slate-400 hover:text-white relative z-10"}>
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: lang + auth */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {status === "authenticated" ? (
            <>
              <span className="hidden text-xs text-slate-500 lg:block truncate max-w-[160px]">{data.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/auth" })}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-amber-400/30 hover:text-amber-400"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-300"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="mt-3 flex items-center gap-1 md:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative px-3 py-1.5 text-xs font-medium transition-colors">
              {isActive && (
                <motion.span
                  layoutId="nav-indicator-mobile"
                  className="absolute inset-0 rounded-lg bg-amber-400/10 border border-amber-400/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={isActive ? "text-amber-400 relative z-10" : "text-slate-400 hover:text-white relative z-10"}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>
    </motion.header>
  );
};
