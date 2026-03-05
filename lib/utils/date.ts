export const formatDate = (input: Date | string, locale = "en-IN"): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatDateTime = (input: Date | string, locale = "en-IN"): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const startOfDayISO = (input: Date | string): string => {
  const date = typeof input === "string" ? new Date(input) : new Date(input);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

export const endOfDayISO = (input: Date | string): string => {
  const date = typeof input === "string" ? new Date(input) : new Date(input);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
};