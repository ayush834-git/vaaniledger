export const formatCurrency = (
  amount: number,
  locale = "en-IN",
  currency: "INR" | string = "INR",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};