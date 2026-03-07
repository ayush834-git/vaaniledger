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
    <div className="inline-flex items-center gap-1 rounded-full border border-accent/8 bg-white/50 p-1 backdrop-blur-sm">
      {supportedLngs.map((lang) => (
        <button
          key={lang}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-200",
            active === lang
              ? "bg-accent text-white shadow-resting"
              : "bg-transparent text-textSecondary hover:text-accent hover:bg-accent/5",
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