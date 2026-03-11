"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useSyncExternalStore } from "react";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { isGuestMode, disableGuestMode } from "@/lib/auth/guestMode";
import { useMicContext } from "@/lib/context/MicContext";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/ledger", labelKey: "nav.ledger" },
  { href: "/goals", labelKey: "Goals" },
];

const subscribeGuest = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("vaaniledger:guest-change", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("vaaniledger:guest-change", cb); };
};

export const AppHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { status, data } = useSession();
  const { t } = useTranslation();
  const guest = useSyncExternalStore(subscribeGuest, isGuestMode, () => false);
  const { isWakeWordListening } = useMicContext();

  const handleGuestSignIn = () => {
    disableGuestMode();
    router.push("/auth");
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className="sticky top-0 z-40 mx-auto w-full border-b border-accent/8 bg-[#FDFAF8]/90 px-4 py-3 backdrop-blur-md sm:px-6"
    >
      {/* Live data pulse bar */}
      <div className="absolute top-0 left-0 h-[2px] w-full overflow-hidden">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-accent to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent border border-accent/20">
            {isWakeWordListening && (
              <motion.div
                className="absolute -inset-1 rounded-lg border-2 border-accent/50"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <span className="text-xs font-bold font-mono text-white relative z-10">VL</span>
          </div>
          <div>
            <span className="font-display text-lg font-semibold text-accent tracking-tight">VaaniLedger</span>
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
          ) : guest ? (
            <>
              <span className="hidden text-[10px] text-textSecondary/70 lg:flex items-center gap-1.5">
                <motion.span 
                  className="inline-block h-1.5 w-1.5 rounded-full bg-secondary"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {t("nav.guestMode")}
              </span>
              <button
                onClick={handleGuestSignIn}
                className="rounded-lg border border-accent/20 bg-transparent px-4 py-1.5 text-xs font-medium text-textSecondary transition hover:border-accent/30 hover:text-accent hover:bg-accent/5"
              >
                {t("nav.signIn")}
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg border border-accent/20 bg-transparent px-4 py-1.5 text-xs font-medium text-textSecondary transition hover:border-accent/30 hover:text-accent hover:bg-accent/5"
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
