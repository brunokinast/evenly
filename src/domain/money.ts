import type { Currency } from "./types";

/** Largest amount the input accepts: 10 digits of cents (99,999,999.99), under the 10¹⁰ rule limit. */
const MAX_DIGITS = 10;

/** EXP-2: digits fill from the right in cents. "1234" → 1234 (12.34). Non-digits and leading zeros go. */
export function digitsToCents(input: string): number {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
  return digits ? Number(digits) : 0;
}

const cache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, options: Intl.NumberFormatOptions) {
  const key = locale + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.NumberFormat(locale, options)));
  return f;
}

/** EXP-2: user's language style with the trip currency's symbol, e.g. "R$ 1.234,56", "$1,234.56". */
export function formatMoney(cents: number, currency: Currency, locale: string): string {
  return nf(locale, { style: "currency", currency }).format(cents / 100);
}

/** The number alone, for amount fields that show the symbol separately: "1.234,56". */
export function formatPlain(cents: number, locale: string): string {
  return nf(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}
