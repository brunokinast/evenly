import { useState } from "react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
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

/** TRIP-1..4, TRIP-10: icon and currency have defaults; Enter on the name only closes the keyboard. */
export function NewTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t("newTrip.title")}>
      {open && <NewTripForm onDone={onClose} />}
    </Sheet>
  );
}

function NewTripForm({ onDone }: { onDone: () => void }) {
  const me = useMe();
  const online = useOnline();
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
      await createTrip({ name: check.name, icon, currency, myName: me.name });
      try {
        localStorage.setItem(LAST_CURRENCY, currency);
      } catch {
        // Storage blocked: no remembered currency.
      }
      // Stay on Home: the new trip tops the list (TRIP-1); a notice confirms it.
      showToast(t("newTrip.created", { trip: check.name }));
      onDone();
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
        onKeyDown={(e) => {
          // TRIP-10: Enter closes the keyboard so the icon and currency are in view; Create creates.
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
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
