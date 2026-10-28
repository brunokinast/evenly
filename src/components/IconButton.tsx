import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** 48×48 round icon button; `label` is its accessible name. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full text-fg active:bg-surface-2 disabled:opacity-50 [&_svg]:size-6",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
