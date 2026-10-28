import { CURRENCIES, type Currency } from "./types";

/** TRIP-3: PT-BR → BRL, otherwise the last currency used, else USD. */
export function defaultCurrency(locale: string, lastUsed: string | null): Currency {
  if (locale === "pt-BR") return "BRL";
  return CURRENCIES.find((c) => c === lastUsed) ?? "USD";
}

export const INVITE_TTL_MS = 60 * 60 * 1000; // INV-2

/** INV-3: the first 6 digits of whatever was typed or pasted. */
export function codeDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

/** INV-1: a random 6-digit code ("000000"–"999999"). */
export function randomCode(random: () => number = Math.random): string {
  return String(Math.floor(random() * 1_000_000)).padStart(6, "0");
}

/** PDF-3: the trip name with symbols removed and spaces as "_", plus "_summary.pdf". */
export function pdfFileName(tripName: string): string {
  const base = tripName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return `${base || "trip"}_summary.pdf`;
}
