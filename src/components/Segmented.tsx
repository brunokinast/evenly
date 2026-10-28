type Props<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

/** Single choice between a few options (theme, currency). */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-[3px] rounded-ctl bg-surface-2 p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="min-h-10 min-w-0 truncate rounded-[7px] px-2 text-caption font-semibold text-fg-muted aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-sm"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
