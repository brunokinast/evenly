import type { InputHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Accessible name of the round button ("Continue", "Add"). */
  submitLabel: string;
  icon: ReactNode;
  /** Marigold once the input is valid; neutral before. */
  ready: boolean;
  busy?: boolean;
  invalid?: boolean;
  /** The button can't submit (e.g. offline, APP-6). */
  submitDisabled?: boolean;
  /** Welcome's 56px field; 48px otherwise. */
  tall?: boolean;
  ref?: React.Ref<HTMLInputElement>;
};

/**
 * A text field with a round submit button inside its right edge (specs/design.md "Field with a submit
 * button"). Place it in a <form>: the button and Enter both submit.
 */
export function SubmitField({
  submitLabel,
  icon,
  ready,
  busy,
  invalid,
  submitDisabled,
  tall,
  className,
  ...rest
}: Props) {
  return (
    <div className="relative w-full min-w-0">
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full min-w-0 rounded-ctl border border-transparent bg-surface-2 pl-3.5 text-body text-fg",
          "placeholder:text-fg-muted focus:border-accent focus:outline-none",
          tall ? "h-14 pr-16" : "h-12 pr-14",
          invalid && "border-negative",
          className,
        )}
        {...rest}
      />
      <button
        type="submit"
        aria-label={submitLabel}
        disabled={submitDisabled}
        className={cn(
          "absolute top-1/2 right-1 grid -translate-y-1/2 place-items-center rounded-[7px] transition-colors [&_svg]:size-5",
          tall ? "right-1.5 size-11" : "size-10",
          ready && !submitDisabled
            ? "bg-accent text-accent-fg active:brightness-95"
            : "bg-surface text-fg-muted",
        )}
      >
        {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : icon}
      </button>
    </div>
  );
}
