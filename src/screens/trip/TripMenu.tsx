import { useState } from "react";
import { LogOut, Pencil, Trash2, UserRoundPlus } from "lucide-react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Button } from "@/components/Button";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Sheet } from "@/components/Sheet";
import { TextField } from "@/components/TextField";
import { deleteTrip, leaveTrip, renameTrip } from "@/data/commands";
import { checkTripName } from "@/domain/members";
import { t } from "@/i18n";
import type { TripView } from "./TripScreen";

type Step = "menu" | "rename" | "delete" | "leave";
type Props = {
  open: boolean;
  view: TripView;
  onClose: () => void;
  onAddGuest: () => void;
  /** Called just before I leave or delete, so losing access isn't announced as a surprise. */
  onLeaving: () => void;
};

/** "⋯" menu: owner → Add guest, Rename, Delete; others → Leave (TRIP-6, TRIP-7, TRIP-11, MEM-5, MEM-8). */
export function TripMenu({ open, view, onClose, onAddGuest, onLeaving }: Props) {
  const { trip, isOwner } = view;
  const online = useOnline();
  const [step, setStep] = useState<Step>("menu");
  const close = () => {
    setStep("menu");
    onClose();
  };
  const item =
    "flex min-h-14 w-full items-center gap-3 rounded-xl px-1 text-left text-row active:bg-surface-2";

  return (
    <>
      <Sheet open={open && step === "menu"} onClose={close} title={trip.name}>
        {isOwner ? (
          <>
            <button type="button" className={item} onClick={onAddGuest}>
              <UserRoundPlus className="size-5" aria-hidden />
              {t("menu.addGuest")}
            </button>
            <button type="button" className={item} onClick={() => setStep("rename")}>
              <Pencil className="size-5" aria-hidden />
              {t("menu.rename")}
            </button>
            <button type="button" className={`${item} text-negative`} onClick={() => setStep("delete")}>
              <Trash2 className="size-5" aria-hidden />
              {t("menu.delete")}
            </button>
          </>
        ) : (
          <button type="button" className={`${item} text-negative`} onClick={() => setStep("leave")}>
            <LogOut className="size-5" aria-hidden />
            {t("menu.leave")}
          </button>
        )}
      </Sheet>

      <Sheet open={open && step === "rename"} onClose={close} title={t("rename.title")}>
        {open && step === "rename" && <RenameForm view={view} onDone={close} />}
      </Sheet>

      <ConfirmSheet
        open={open && step === "delete"}
        title={t("deleteTrip.title")}
        body={t("deleteTrip.body")}
        confirm={t("menu.delete")}
        cancel={t("common.cancel")}
        errorText={t("common.error")}
        disabled={!online || !view.expensesLoaded}
        onClose={close}
        onConfirm={async () => {
          onLeaving();
          await deleteTrip(
            trip,
            view.expenses.map((e) => e.id),
          );
          showToast(t("deleteTrip.done")); // TripScreen goes Home once the trip is gone.
        }}
      />

      <ConfirmSheet
        open={open && step === "leave"}
        title={t("leave.title")}
        body={t("leave.body")}
        confirm={t("menu.leave")}
        cancel={t("common.cancel")}
        errorText={t("common.error")}
        disabled={!online}
        onClose={close}
        onConfirm={async () => {
          onLeaving();
          await leaveTrip(trip);
          showToast(t("leave.done", { trip: trip.name })); // TripScreen goes Home once access is gone.
        }}
      />
    </>
  );
}

/** TRIP-11. */
function RenameForm({ view, onDone }: { view: TripView; onDone: () => void }) {
  const online = useOnline();
  const [name, setName] = useState(view.trip.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const check = checkTripName(name);
        if (!check.ok) return setError(t(check.error === "empty" ? "tripName.empty" : "tripName.tooLong"));
        if (check.name === view.trip.name) return onDone();
        setBusy(true);
        try {
          await renameTrip(view.trip, check.name);
          onDone();
        } catch {
          setError(t("common.error"));
          setBusy(false);
        }
      }}
    >
      <TextField
        label={t("newTrip.name")}
        autoFocus
        enterKeyHint="done"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <Button type="submit" variant="primary" className="w-full" busy={busy} disabled={!online}>
        {t("common.save")}
      </Button>
    </form>
  );
}
