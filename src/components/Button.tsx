import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg active:brightness-95 disabled:bg-surface-2 disabled:text-fg-muted",
  secondary: "bg-surface-2 text-fg active:brightness-95 disabled:text-fg-muted",
  quiet: "text-fg-muted font-medium disabled:opacity-50",
  destructive: "text-negative disabled:opacity-50",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** EXP-8: spinner replaces the label and the button is disabled. */
  busy?: boolean;
};

export function Button({ variant = "secondary", busy, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-ctl px-[18px] text-row",
        "[&_svg]:size-5 [&_svg]:shrink-0",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : children}
    </button>
  );
}
