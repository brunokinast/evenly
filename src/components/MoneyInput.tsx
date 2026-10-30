import type { InputHTMLAttributes, Ref } from "react";
import { digitsToCents } from "@/domain/money";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  /** null = empty (shows the placeholder). */
  cents: number | null;
  onCents: (cents: number | null) => void;
  /** Formats a value for display, e.g. with the currency symbol. */
  format: (cents: number) => string;
  /** When empty, show format(0) as the text (style it muted) instead of a placeholder, so a centered
   * field's caret sits at the end of it, where digits appear. */
  zero?: boolean;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Money input (specs/design.md, EXP-2): digits fill from the right in cents, the caret stays at the end,
 * and the value is formatted as you type. Clearing it gives null.
 */
export function MoneyInput({ cents, onCents, format, zero, ...rest }: Props) {
  const toEnd = (el: HTMLInputElement) =>
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      value={cents ? format(cents) : zero ? format(0) : ""}
      onChange={(e) => {
        const next = digitsToCents(e.target.value);
        onCents(next > 0 ? next : null);
        toEnd(e.target);
      }}
      onFocus={(e) => toEnd(e.target)}
      onClick={(e) => toEnd(e.currentTarget)}
      {...rest}
    />
  );
}
