export const supportedLngs = ["en", "hi", "te", "ta"] as const;

export type AppLanguage = (typeof supportedLngs)[number];

export const fallbackLng: AppLanguage = "en";

export const defaultNS = "common";

export const languageStorageKey = "vaaniledger.lang";