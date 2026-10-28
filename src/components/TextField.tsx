import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Shown visually; otherwise the label is for screen readers only. */
  showLabel?: boolean;
  error?: string | null;
};

export function TextField({ label, showLabel, error, className, ...rest }: Props) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={showLabel ? "text-caption text-fg-muted" : "sr-only"}>
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "min-h-12 w-full min-w-0 rounded-ctl border border-transparent bg-surface-2 px-3.5 text-body text-fg",
          "placeholder:text-fg-muted focus:border-accent focus:outline-none",
          error && "border-negative",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
