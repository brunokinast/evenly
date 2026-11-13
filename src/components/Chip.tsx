import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  plain: "bg-surface-2 [&>svg]:text-fg-muted",
  /** AST-7: a value Evenly guessed, to look at. */
  guess: "bg-accent-soft text-accent-text outline-2 -outline-offset-2 outline-accent",
  /** AST-7: a value that's missing. */
  missing: "bg-surface-2 text-negative outline-2 -outline-offset-2 outline-negative",
};

/** A compact field value that opens its picker (Gemini review, specs/design.md "Chips"). */
export function Chip({
  icon,
  tone = "plain",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; tone?: keyof typeof tones }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 max-w-full min-w-0 items-center gap-1.5 rounded-full px-3 text-caption font-semibold active:opacity-70 [&>svg]:size-4 [&>svg]:shrink-0",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
