import { useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Calendar } from "@/components/Calendar";
import { MoneyInput } from "@/components/MoneyInput";
import { Segmented } from "@/components/Segmented";
import { Sheet } from "@/components/Sheet";
import { Wheel } from "@/components/Wheel";
import { listOrder, type Person } from "@/domain/members";
import { formatPlain } from "@/domain/money";
import { customShares } from "@/domain/split";
import type { Trip } from "@/domain/types";
import { dayDateLabel, hourLabel, locale, minuteLabel, money, t, timeLabel } from "@/i18n";
import { cn } from "@/lib/cn";

type Common = { trip: Trip; people: Map<string, Person>; myId: string };
const nameOf = (p: Common, id: string) => (id === p.myId ? t("common.you") : (p.people.get(id)?.name ?? ""));
/** MEM-6: me first, then join order. */
const listed = (p: Common) =>
  listOrder(
    p.trip.members.map((m) => m.id),
    p.myId,
  ).map((id) => p.trip.members.find((m) => m.id === id)!);

function Checkmark({ on, box }: { on: boolean; box?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center border-2 border-border",
        box ? "rounded-[6px]" : "rounded-full",
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
        {listed(p).map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={p.value === m.id}
            onClick={() => p.onPick(m.id)}
            className="flex min-h-14 w-full items-center gap-3 rounded-ctl px-1 text-left active:bg-surface-2"
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
        {listed(p).map((m) => {
          const on = p.parts.includes(m.id);
          const name = nameOf(p, m.id);
          return (
            <div key={m.id} className="flex min-h-14 items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(m.id)}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-ctl text-left active:bg-surface-2"
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

/** When: date and time, not in the future (EXP-11), as two rows that open a picker (EXP-17). */
export function WhenSheet(p: {
  open: boolean;
  value: number;
  onPick: (ms: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={p.open} onClose={p.onClose} title={t("form.dateTime")} focusField={false}>
      {p.open && <WhenForm {...p} />}
    </Sheet>
  );
}

const midnight = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const timeAt = (h: number, m: number) => timeLabel(new Date(2000, 0, 1, h, m).getTime());
const HOURS = Array.from({ length: 24 }, (_, h) => hourLabel(h));
const MINUTES = Array.from({ length: 60 }, (_, m) => minuteLabel(m));
const SHORTCUTS = [
  ["form.breakfast", 8, 0],
  ["form.lunch", 12, 30],
  ["form.dinner", 20, 0],
] as const;

function WhenForm({ value, onPick }: { value: number; onPick: (ms: number) => void }) {
  const [now] = useState(Date.now);
  const [day, setDay] = useState(() => midnight(value));
  const [h, setH] = useState(() => new Date(value).getHours());
  const [m, setM] = useState(() => new Date(value).getMinutes());
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  const at = (d: Date, hh: number, mm: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm).getTime();
  const ms = at(day, h, m);
  const future = ms > now;
  const today = midnight(now);
  const nowD = new Date(now);
  const shortcuts = [
    { label: t("form.now"), h: nowD.getHours(), m: nowD.getMinutes(), now: true },
    ...SHORTCUTS.map(([k, hh, mm]) => ({ label: t(k), h: hh, m: mm, now: false })),
  ];
  const toggle = (k: "date" | "time") => setOpen((o) => (o === k ? null : k));
  return (
    <>
      <div className="overflow-hidden rounded-card bg-surface-2">
        <PickerRow
          icon={<CalendarDays />}
          k={t("form.date")}
          v={dayDateLabel(ms)}
          open={open === "date"}
          onClick={() => toggle("date")}
        />
        <Panel open={open === "date"}>
          <Calendar value={day} max={today} onPick={setDay} />
        </Panel>
        <div className="mx-3.5 border-t border-border" />
        <PickerRow
          icon={<Clock />}
          k={t("form.time")}
          v={timeAt(h, m)}
          open={open === "time"}
          onClick={() => toggle("time")}
        />
        <Panel open={open === "time"}>
          <div className="relative flex items-center justify-center gap-1">
            <div aria-hidden className="absolute inset-x-0 top-[88px] h-11 rounded-ctl bg-surface" />
            <Wheel label={t("form.hour")} options={HOURS} value={h} onChange={setH} />
            <span aria-hidden className="relative text-title">
              :
            </span>
            <Wheel label={t("form.minute")} options={MINUTES} value={m} onChange={setM} />
          </div>
          <div role="group" aria-label={t("form.shortcuts")} className="mt-3 grid grid-cols-4 gap-2">
            {shortcuts.map((s) => {
              const on = s.h === h && s.m === m && (!s.now || +day === +today);
              const disabled = !s.now && at(day, s.h, s.m) > now;
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => {
                    if (s.now) setDay(today);
                    setH(s.h);
                    setM(s.m);
                  }}
                  className="group flex min-h-14 min-w-0 flex-col items-center justify-center rounded-ctl bg-surface px-1 py-1.5 disabled:opacity-40 aria-pressed:bg-accent-soft aria-pressed:text-accent-text aria-pressed:outline-2 aria-pressed:-outline-offset-2 aria-pressed:outline-accent"
                >
                  <span className="max-w-full truncate text-tag text-fg-muted group-aria-pressed:text-accent-text">
                    {s.label}
                  </span>
                  <span className="text-caption font-bold whitespace-nowrap">{timeAt(s.h, s.m)}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
      {future && (
        <p role="alert" className="text-caption text-negative">
          {t("form.future")}
        </p>
      )}
      <Button variant="primary" className="w-full" disabled={future} onClick={() => onPick(ms)}>
        {t("common.done")}
      </Button>
    </>
  );
}

/** A Date and time row: icon tile, label over value, chevron; accent while its picker is open. */
function PickerRow(p: { icon: React.ReactNode; k: string; v: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={p.open}
      onClick={p.onClick}
      className="group flex min-h-16 w-full items-center gap-3 px-3.5 py-2.5 text-left"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-surface text-fg-muted group-aria-expanded:bg-accent-soft group-aria-expanded:text-accent-text [&>svg]:size-5">
        {p.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption text-fg-muted">{p.k}</span>
        <span className="block truncate text-row group-aria-expanded:text-accent-text">{p.v}</span>
      </span>
      <ChevronDown className="size-5 shrink-0 text-fg-muted transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" />
    </button>
  );
}

/** Slides open under its row; inert while closed so its controls are out of reach. */
function Panel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="px-3 pb-3.5">{children}</div>
      </div>
    </div>
  );
}
