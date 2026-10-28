import { formatMoney } from "@/domain/money";
import { daysAgo, dayKey } from "@/domain/dates";
import type { Currency } from "@/domain/types";
import { en, type MessageKey } from "./en";
import { ptBR } from "./pt-BR";

export type { MessageKey };

/** APP-1: device language, fallback English. */
export const locale = navigator.languages.some((l) => l.toLowerCase().startsWith("pt")) ? "pt-BR" : "en";
const messages: Record<MessageKey, string> = locale === "pt-BR" ? ptBR : en;
document.documentElement.lang = locale;

type Vars = Record<string, string | number>;

/** Translates a key; `{name}` placeholders are filled from vars. */
export function t(key: MessageKey, vars?: Vars): string {
  const text = messages[key];
  return vars ? text.replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? `{${v}}`)) : text;
}

type PluralBase = MessageKey extends infer K ? (K extends `${infer B}.one` ? B : never) : never;

/** Count-dependent text: `{n}` is filled with the formatted count. */
export function tn(base: PluralBase, n: number, vars?: Vars): string {
  return t(`${base}.${n === 1 ? "one" : "other"}` as MessageKey, { ...vars, n: n.toLocaleString(locale) });
}

// ---------- formatting (Intl only, never by hand) ----------

/** EXP-2: amount in the user's language with the trip currency's symbol. */
export const money = (cents: number, currency: Currency) => formatMoney(cents, currency, locale);

const dtf = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
const time = dtf({ hour: "numeric", minute: "2-digit" });
const shortDay = dtf({ weekday: "short", month: "short", day: "numeric" });
const longDay = dtf({ month: "short", day: "numeric", year: "numeric" });
const dayMonth = dtf({ month: "short", day: "numeric" });

export const timeLabel = (ms: number) => time.format(ms);
export const longDate = (ms: number) => longDay.format(ms);
/** "Oct 26". */
export const shortDate = (ms: number) => dayMonth.format(ms);

/** "Today", "Yesterday", or "Mon, Oct 26". */
export function dayLabel(ms: number) {
  const ago = daysAgo(dayKey(ms), Date.now());
  return ago === 0 ? t("date.today") : ago === 1 ? t("date.yesterday") : shortDay.format(ms);
}

/** "Today, 8:15 PM". */
export const whenLabel = (ms: number) => `${dayLabel(ms)}, ${timeLabel(ms)}`;
