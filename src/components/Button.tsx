import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg active:brightness-95 disabled:bg-surface-2 disabled:text-fg-muted",
  secondary: "bg-surface-2 text-fg active:brightness-95 disabled:text-fg-muted",
  quiet: "text-fg-muted font-medium disabled:opacity-50",
  destructive: "text-negative disabled:opacity-50",
};

const sizes = {
  /** Every action in screens and sheets. */
  md: "min-h-12 px-[18px] py-2.5 text-row [&_svg]:size-5",
  /** Actions in a header: Invite in the trip bar, Edit in Expense details. */
  sm: "min-h-10 px-3 py-2 text-caption font-semibold [&_svg]:size-[18px]",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  /** EXP-8: spinner replaces the label and the button is disabled. */
  busy?: boolean;
};

/** specs/design.md "Buttons": the label is never cut; as a last resort it wraps. */
export function Button({
  variant = "secondary",
  size = "md",
  busy,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-ctl text-center text-balance [&_svg]:shrink-0",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : children}
    </button>
  );
}

/**
 * Buttons side by side, equal width, that stack full-width when a label doesn't fit on one line
 * (specs/design.md "Bottom action bar"). The last button ends up at the bottom.
 */
export function ButtonRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2.5 [&>*]:min-w-max [&>*]:flex-[1_1_0]", className)}>
      {children}
    </div>
  );
}
