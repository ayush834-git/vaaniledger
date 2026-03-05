"use client";

import { useTranslation } from "react-i18next";

import { languageStorageKey, supportedLngs, type AppLanguage } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

const labels: Record<AppLanguage, string> = {
  en: "EN",
  hi: "\u0939\u093f\u0902",
  te: "\u0c24\u0c46",
  ta: "\u0ba4\u0bae\u0bbf",
};

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const active = (i18n.language.split("-")[0] || "en") as AppLanguage;

  const onSwitch = async (lang: AppLanguage) => {
    window.localStorage.setItem(languageStorageKey, lang);
    await i18n.changeLanguage(lang);
  };

  return (
    <div className="inline-flex rounded-lg border border-accent/12 bg-white p-1 shadow-sm">
      {supportedLngs.map((lang) => (
        <button
          key={lang}
          className={cn(
            "h-8 rounded-md px-2.5 text-xs font-medium transition-all",
            active === lang
              ? "bg-accent text-white shadow-sm"
              : "bg-transparent text-textSecondary hover:text-accent",
          )}
          onClick={() => onSwitch(lang)}
          type="button"
        >
          {labels[lang]}
        </button>
      ))}
    </div>
  );
};