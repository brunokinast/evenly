import { codeDigits } from "@/domain/trips";
import { cn } from "@/lib/cn";

type Props = { value: string; onChange: (digits: string) => void; label: string; disabled?: boolean };

/** INV-3: 6 boxes backed by one numeric input; paste keeps the first 6 digits. Focused on open. */
export function CodeInput({ value, onChange, label, disabled }: Props) {
  return (
    <label className="relative grid grid-cols-6 gap-2">
      <input
        autoFocus
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(codeDigits(e.target.value))}
        className="absolute inset-0 z-10 opacity-0"
      />
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "grid h-14 min-w-0 place-items-center rounded-ctl border-2 border-transparent bg-surface-2 text-[24px] font-bold",
            i === value.length && "border-accent",
          )}
        >
          {value[i] ?? ""}
        </span>
      ))}
    </label>
  );
}
