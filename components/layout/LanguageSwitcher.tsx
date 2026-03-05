"use client";

import { useTranslation } from "react-i18next";

import { languageStorageKey, supportedLngs, type AppLanguage } from "@/lib/i18n/config";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const labels: Record<AppLanguage, string> = {
  en: "EN",
  hi: "???",
  te: "??",
  ta: "?",
};

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const active = (i18n.language.split("-")[0] || "en") as AppLanguage;

  const onSwitch = async (lang: AppLanguage) => {
    window.localStorage.setItem(languageStorageKey, lang);
    await i18n.changeLanguage(lang);
  };

  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-bg/70 p-1">
      {supportedLngs.map((lang) => (
        <Button
          key={lang}
          className={cn(
            "h-8 rounded-md border-none px-2 text-xs",
            active === lang ? "bg-accent text-bg" : "bg-transparent text-textSecondary hover:text-textPrimary",
          )}
          onClick={() => onSwitch(lang)}
          type="button"
          variant="ghost"
        >
          {labels[lang]}
        </Button>
      ))}
    </div>
  );
};