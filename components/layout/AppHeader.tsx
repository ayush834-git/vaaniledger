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
      className="sticky top-3 z-50 mx-auto max-w-7xl rounded-2xl border border-accent/12 bg-white px-6 py-3 shadow-soft"
    >
      {/* Live data pulse bar */}
      <div className="absolute top-0 left-0 h-[2px] w-full overflow-hidden rounded-t-2xl">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-accent to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
            <span className="text-xs font-bold font-mono text-accent">VL</span>
          </div>
          <div>
            <span className="font-display text-lg font-bold text-accent tracking-tight">VaaniLedger</span>
            <span className="ml-2 hidden text-[10px] text-textSecondary md:inline">{t("app.voiceFirst")}</span>
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
                    className="absolute inset-0 rounded-lg bg-accent text-white"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={isActive ? "text-white relative z-10" : "text-textSecondary hover:text-accent relative z-10"}>
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
              <span className="hidden text-xs text-textSecondary lg:block truncate max-w-[160px]">{data.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/auth" })}
                className="rounded-lg border border-accent/12 px-3 py-1.5 text-xs text-textSecondary transition hover:border-accent/30 hover:text-accent"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#CC4400] shadow-glow"
            >
              {t("nav.signIn")}
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
                  className="absolute inset-0 rounded-lg bg-accent"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={isActive ? "text-white relative z-10" : "text-textSecondary hover:text-accent relative z-10"}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>
    </motion.header>
  );
};
