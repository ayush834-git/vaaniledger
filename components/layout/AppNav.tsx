"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", labelKey: "nav.home" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/ledger", labelKey: "nav.ledger" },
  { href: "/goals", labelKey: "Goals" },
];

export const AppNav = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex items-center gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition",
              isActive ? "bg-accent text-bg" : "text-textSecondary hover:bg-white/10 hover:text-textPrimary",
            )}
          >
            {item.labelKey === "Goals" ? "Goals" : t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
};