import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const ROW = 44; // px, matches h-11

/**
 * Scroll-and-snap wheel (specs/design.md, Date and time sheet): five rows visible, the middle one is the
 * value. A listbox for screen readers and keyboards (arrow keys); tapping a row picks it.
 */
export function Wheel(props: {
  label: string;
  options: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  const { options, value, onChange } = props;
  const ref = useRef<HTMLDivElement>(null);
  // While we scroll to a value ourselves, the rows passed on the way aren't picks.
  const target = useRef<{ top: number; until: number } | null>(null);

  // Follow the value when it changes from outside (a shortcut) or on mount.
  useEffect(() => {
    const el = ref.current;
    if (!el || Math.round(el.scrollTop / ROW) === value) return;
    const smooth = el.dataset.ready && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.current = { top: value * ROW, until: Date.now() + 700 };
    el.scrollTo({ top: value * ROW, behavior: smooth ? "smooth" : "instant" });
    el.dataset.ready = "1";
  }, [value]);

  const pick = (i: number) => onChange(Math.max(0, Math.min(options.length - 1, i)));
  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={props.label}
      tabIndex={0}
      onScroll={(e) => {
        const el = e.currentTarget;
        const own = target.current;
        if (own && Date.now() < own.until && Math.abs(el.scrollTop - own.top) > 1) return;
        target.current = null;
        const i = Math.round(el.scrollTop / ROW);
        if (i !== value) pick(i);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          pick(value + (e.key === "ArrowDown" ? 1 : -1));
        }
      }}
      className="relative h-[220px] w-24 snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-ctl [scrollbar-width:none] [mask-image:linear-gradient(transparent,#000_30%,#000_70%,transparent)] focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div aria-hidden className="h-[88px]" />
      {options.map((o, i) => (
        <div
          key={i}
          role="option"
          aria-selected={i === value}
          onClick={() => pick(i)}
          className={cn(
            "grid h-11 snap-center place-items-center text-title transition-colors",
            i === value ? "text-fg" : "font-normal text-fg-muted",
          )}
        >
          {o}
        </div>
      ))}
      <div aria-hidden className="h-[88px]" />
    </div>
  );
}
