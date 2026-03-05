"use client";

import i18n from "i18next";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

import { defaultNS, fallbackLng, languageStorageKey, supportedLngs } from "@/lib/i18n/config";
import { resources } from "@/lib/i18n/resources";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: fallbackLng,
    fallbackLng,
    supportedLngs,
    defaultNS,
    ns: [defaultNS],
    interpolation: {
      escapeValue: false,
    },
  });
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    if (storedLanguage && supportedLngs.includes(storedLanguage as (typeof supportedLngs)[number])) {
      void i18n.changeLanguage(storedLanguage);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};