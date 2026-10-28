import { useState } from "react";
import { useLocation } from "wouter";
import { openTrip } from "@/app/nav";
import { useOnline } from "@/app/online";
import { Button } from "@/components/Button";
import { Segmented } from "@/components/Segmented";
import { Sheet } from "@/components/Sheet";
import { TextField } from "@/components/TextField";
import { TRIP_ICON } from "@/components/TripIcon";
import { createTrip } from "@/data/commands";
import { useMe } from "@/data/session";
import { checkTripName } from "@/domain/members";
import { defaultCurrency } from "@/domain/trips";
import { CURRENCIES, TRIP_ICONS, type Currency, type TripIcon } from "@/domain/types";
import { locale, t } from "@/i18n";

const LAST_CURRENCY = "evenly.lastCurrency";

function lastCurrency() {
  try {
    return localStorage.getItem(LAST_CURRENCY);
  } catch {
    return null;
  }
}

/** TRIP-1..4, TRIP-10: name + Enter creates the trip; icon and currency have defaults. */
export function NewTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t("newTrip.title")}>
      {open && <NewTripForm />}
    </Sheet>
  );
}

function NewTripForm() {
  const me = useMe();
  const online = useOnline();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<TripIcon>("luggage");
  const [currency, setCurrency] = useState<Currency>(() => defaultCurrency(locale, lastCurrency()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const check = checkTripName(name);
    if (!check.ok) return setError(t(check.error === "empty" ? "tripName.empty" : "tripName.tooLong"));
    setBusy(true);
    try {
      const id = await createTrip({ name: check.name, icon, currency, myName: me.name });
      try {
        localStorage.setItem(LAST_CURRENCY, currency);
      } catch {
        // Storage blocked: no remembered currency.
      }
      await openTrip(navigate, `/trip/${id}/members`);
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <TextField
        label={t("newTrip.name")}
        placeholder={t("newTrip.name")}
        autoFocus
        enterKeyHint="done"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <span className="text-caption text-fg-muted">{t("newTrip.icon")}</span>
      <div role="group" aria-label={t("newTrip.icon")} className="grid grid-cols-6 gap-2">
        {TRIP_ICONS.map((id) => {
          const Icon = TRIP_ICON[id];
          return (
            <button
              key={id}
              type="button"
              aria-label={t(`icon.${id}`)}
              aria-pressed={icon === id}
              onClick={() => setIcon(id)}
              className="grid h-12 min-w-0 place-items-center rounded-ctl bg-surface-2 aria-pressed:bg-accent-soft aria-pressed:text-accent-text aria-pressed:outline-2 aria-pressed:-outline-offset-2 aria-pressed:outline-accent"
            >
              <Icon className="size-5" aria-hidden />
            </button>
          );
        })}
      </div>
      <span className="text-caption text-fg-muted">{t("newTrip.currency")}</span>
      <Segmented<Currency>
        label={t("newTrip.currency")}
        value={currency}
        onChange={setCurrency}
        options={CURRENCIES.map((c) => ({ value: c, label: c }))}
      />
      <Button type="submit" variant="primary" className="w-full" busy={busy} disabled={!online}>
        {t("newTrip.create")}
      </Button>
    </form>
  );
}
