import { useState } from "react";
import { Check } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { MoneyInput } from "@/components/MoneyInput";
import { Segmented } from "@/components/Segmented";
import { Sheet } from "@/components/Sheet";
import { dayKey, fromKeys, timeKey } from "@/domain/dates";
import type { Person } from "@/domain/members";
import { formatPlain } from "@/domain/money";
import { customShares } from "@/domain/split";
import type { Trip } from "@/domain/types";
import { locale, money, t } from "@/i18n";
import { cn } from "@/lib/cn";

type Common = { trip: Trip; people: Map<string, Person>; myId: string };
const nameOf = (p: Common, id: string) => (id === p.myId ? t("common.you") : (p.people.get(id)?.name ?? ""));

function Checkmark({ on, box }: { on: boolean; box?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center border-2 border-border",
        box ? "rounded-[7px]" : "rounded-full",
        on && "border-accent bg-accent text-accent-fg",
      )}
    >
      {on && <Check className="size-4" strokeWidth={3} />}
    </span>
  );
}

/** Paid by: single choice, closes on pick (EXP-5: the payer doesn't have to be in the split). */
export function PayerSheet(
  p: Common & { open: boolean; value: string; onPick: (id: string) => void; onClose: () => void },
) {
  return (
    <Sheet open={p.open} onClose={p.onClose} title={t("form.paidBy")}>
      <div role="radiogroup" aria-label={t("form.paidBy")} className="flex flex-col">
        {p.trip.members.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={p.value === m.id}
            onClick={() => p.onPick(m.id)}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 text-left active:bg-surface-2"
          >
            <Avatar id={m.id} name={m.name} guest={p.people.get(m.id)?.guest} />
            <span className="min-w-0 flex-1 truncate text-row">{nameOf(p, m.id)}</span>
            <Checkmark on={p.value === m.id} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

type SplitProps = Common & {
  open: boolean;
  cents: number;
  payerId: string;
  parts: string[];
  custom: boolean;
  typed: Record<string, number>;
  onChange: (next: { parts?: string[]; custom?: boolean; typed?: Record<string, number> }) => void;
  onClose: () => void;
};

/** Split: tick participants; Equally or Custom amounts (EXP-12). Updates in place while open. */
export function SplitSheet(p: SplitProps) {
  const order = p.trip.members.map((m) => m.id);
  const auto = p.custom ? customShares(p.cents, p.parts, p.typed, p.payerId) : null;

  function toggle(id: string) {
    const on = p.parts.includes(id);
    const parts = on ? p.parts.filter((x) => x !== id) : order.filter((x) => x === id || p.parts.includes(x));
    const typed = { ...p.typed };
    if (on) delete typed[id];
    p.onChange({ parts, typed });
  }

  let status = t("form.equalHint");
  if (auto) {
    status =
      auto.remaining > 0
        ? t("form.remaining", { amount: money(auto.remaining, p.trip.currency) })
        : auto.remaining < 0
          ? t("form.over", { amount: money(-auto.remaining, p.trip.currency) })
          : t("form.addsUp");
  }

  return (
    <Sheet open={p.open} onClose={p.onClose} title={t("form.split")}>
      <Segmented<"equal" | "custom">
        label={t("form.split")}
        value={p.custom ? "custom" : "equal"}
        onChange={(mode) =>
          p.onChange({ custom: mode === "custom", typed: mode === "custom" ? p.typed : {} })
        }
        options={[
          { value: "equal", label: t("form.equally") },
          { value: "custom", label: t("form.custom") },
        ]}
      />
      {p.custom && <p className="text-caption text-fg-muted">{t("form.customHint")}</p>}
      <div className="flex flex-col">
        {p.trip.members.map((m) => {
          const on = p.parts.includes(m.id);
          const name = nameOf(p, m.id);
          return (
            <div key={m.id} className="flex min-h-14 items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(m.id)}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl text-left active:bg-surface-2"
              >
                <Checkmark on={on} box />
                <Avatar id={m.id} name={m.name} size="sm" guest={p.people.get(m.id)?.guest} />
                <span className="min-w-0 flex-1 truncate text-row">{name}</span>
              </button>
              {auto && on && (
                <MoneyInput
                  aria-label={t("form.amountFor", { name })}
                  cents={p.typed[m.id] ?? null}
                  format={(c) => formatPlain(c, locale)}
                  placeholder={formatPlain(auto.shares[m.id] ?? 0, locale)}
                  onCents={(c) => {
                    const typed = { ...p.typed };
                    // Clearing returns to the automatic share.
                    if (c === null) delete typed[m.id];
                    else typed[m.id] = c;
                    p.onChange({ typed });
                  }}
                  className="min-h-12 w-32 shrink-0 rounded-ctl border border-transparent bg-surface-2 px-3 text-right text-body font-semibold placeholder:font-normal placeholder:text-fg-muted focus:border-accent focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>
      <p
        className={cn("text-caption", auto && auto.remaining !== 0 ? "text-negative" : "text-fg-muted")}
        aria-live="polite"
      >
        {status}
      </p>
      <Button variant="primary" className="w-full" onClick={p.onClose}>
        {t("common.done")}
      </Button>
    </Sheet>
  );
}

/** When: date and time, not in the future (EXP-11). */
export function WhenSheet(p: {
  open: boolean;
  value: number;
  onPick: (ms: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={p.open} onClose={p.onClose} title={t("form.dateTime")}>
      {p.open && <WhenForm {...p} />}
    </Sheet>
  );
}

function WhenForm({ value, onPick }: { value: number; onPick: (ms: number) => void }) {
  const [day, setDay] = useState(dayKey(value));
  const [time, setTime] = useState(timeKey(value));
  const [error, setError] = useState(false);
  const [today] = useState(() => dayKey(Date.now()));
  const field =
    "min-h-12 w-full min-w-0 rounded-ctl border border-transparent bg-surface-2 px-3.5 text-body focus:border-accent focus:outline-none";
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!day || !time) return setError(true);
        const ms = fromKeys(day, time);
        if (ms > Date.now()) return setError(true);
        onPick(ms);
      }}
    >
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <input
          type="date"
          aria-label={t("form.date")}
          max={today}
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            setError(false);
          }}
          className={field}
        />
        <input
          type="time"
          aria-label={t("form.time")}
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setError(false);
          }}
          className={field}
        />
      </div>
      {error && (
        <p role="alert" className="text-caption text-negative">
          {t("form.future")}
        </p>
      )}
      <Button type="submit" variant="primary" className="w-full">
        {t("common.done")}
      </Button>
    </form>
  );
}
