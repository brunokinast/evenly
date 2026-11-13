import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/Button";
import { MoneyInput } from "@/components/MoneyInput";
import { Sheet } from "@/components/Sheet";
import { TripTile } from "@/components/TripIcon";
import type { Trip } from "@/domain/types";
import { money, t } from "@/i18n";

/** AST-6: the amount chip's keypad, filling from the right like Add expense (EXP-2). */
export function AmountSheet(p: {
  open: boolean;
  trip: Trip;
  cents: number | null;
  onDone: (cents: number | null) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={p.open} onClose={p.onClose} title={t("form.amount")}>
      {p.open && <AmountForm {...p} />}
    </Sheet>
  );
}

function AmountForm(p: { trip: Trip; cents: number | null; onDone: (cents: number | null) => void }) {
  const [cents, setCents] = useState(p.cents);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        p.onDone(cents);
      }}
    >
      <MoneyInput
        aria-label={t("form.amount")}
        enterKeyHint="done"
        cents={cents}
        format={(c) => money(c, p.trip.currency)}
        zero
        onCents={setCents}
        className="min-h-14 w-full rounded-ctl border border-transparent bg-surface-2 px-3.5 text-center text-title focus:border-accent focus:outline-none"
      />
      <Button type="submit" variant="primary" className="w-full">
        {t("common.done")}
      </Button>
    </form>
  );
}

/** AST-6, AST-8: which trip a line goes to; single choice, closes on pick. */
export function TripSheet(p: {
  open: boolean;
  trips: readonly Trip[];
  value: string;
  onPick: (tripId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={p.open} onClose={p.onClose} title={t("gemini.trip")}>
      <div role="radiogroup" aria-label={t("gemini.trip")} className="flex flex-col">
        {p.trips.map((trip) => (
          <button
            key={trip.id}
            type="button"
            role="radio"
            aria-checked={p.value === trip.id}
            onClick={() => p.onPick(trip.id)}
            className="flex min-h-14 w-full items-center gap-3 rounded-ctl px-1 py-1 text-left active:bg-surface-2"
          >
            <TripTile icon={trip.icon} />
            <span className="min-w-0 flex-1 truncate text-row">{trip.name}</span>
            {p.value === trip.id && <Check className="size-5 shrink-0 text-accent-text" aria-hidden />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
