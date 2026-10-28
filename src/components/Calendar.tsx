import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { locale, t } from "@/i18n";
import { cn } from "@/lib/cn";

const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
const dayName = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
// 1 Jan 2023 was a Sunday: the grid's weeks start on Sunday.
const weekdays = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2023, 0, 1 + i)),
);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Month calendar (specs/design.md, Date and time sheet): fixed 6-week grid, days after `max` disabled.
 * `value` and `max` are local midnights.
 */
export function Calendar({ value, max, onPick }: { value: Date; max: Date; onPick: (day: Date) => void }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = view.getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const canNext = view < new Date(max.getFullYear(), max.getMonth(), 1);
  const title = monthTitle.format(view);
  const nav = "grid size-10 place-items-center rounded-full active:bg-surface disabled:opacity-30";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          className={nav}
          aria-label={t("cal.prev")}
          onClick={() => setView(new Date(y, m - 1, 1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <p aria-live="polite" className="text-row">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </p>
        <button
          type="button"
          className={nav}
          aria-label={t("cal.next")}
          disabled={!canNext}
          onClick={() => setView(new Date(y, m + 1, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {weekdays.map((w, i) => (
          <span key={i} aria-hidden className="pt-1 pb-1.5 text-tag text-fg-muted">
            {w.toUpperCase()}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => {
          const n = i - lead + 1;
          if (n < 1 || n > days) return <span key={i} className="h-10" />;
          const d = new Date(y, m, n);
          const on = sameDay(d, value);
          return (
            <button
              key={i}
              type="button"
              aria-label={dayName.format(d)}
              aria-pressed={on}
              disabled={d > max}
              onClick={() => onPick(d)}
              className={cn(
                "mx-auto grid size-10 place-items-center rounded-full text-body disabled:opacity-35",
                on ? "bg-accent font-bold text-accent-fg" : "active:bg-surface",
                !on && sameDay(d, max) && "ring-[1.5px] ring-accent ring-inset",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
