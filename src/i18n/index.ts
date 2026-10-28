import { en, type MessageKey } from "./en";
import { ptBR } from "./pt-BR";

export type { MessageKey };

/** APP-1: device language, fallback English. */
export const locale = navigator.languages.some((l) => l.toLowerCase().startsWith("pt")) ? "pt-BR" : "en";
const messages: Record<MessageKey, string> = locale === "pt-BR" ? ptBR : en;
document.documentElement.lang = locale;

/** Translates a key; `{name}` placeholders are filled from vars. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text = messages[key];
  return vars ? text.replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? `{${v}}`)) : text;
}
