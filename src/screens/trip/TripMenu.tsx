import { useState } from "react";
import { LogOut, Pencil, Trash2, UserRoundPlus } from "lucide-react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Button } from "@/components/Button";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { ListGroup, Row } from "@/components/List";
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
  /** After leaving: back to Home (APP-9: the trip is still there for the others, so it never goes "gone" here). */
  onLeft: () => void;
};

/** "⋯" menu: owner → Add guest, Rename, Delete; others → Leave (TRIP-6, TRIP-7, TRIP-11, MEM-5, MEM-8). */
export function TripMenu({ open, view, onClose, onAddGuest, onLeaving, onLeft }: Props) {
  const { trip, isOwner } = view;
  const online = useOnline();
  const [step, setStep] = useState<Step>("menu");
  const close = () => {
    setStep("menu");
    onClose();
  };
  const icon = "size-5 shrink-0";

  return (
    <>
      <Sheet open={open && step === "menu"} onClose={close} title={trip.name}>
        {/* specs/design.md "⋯ menu sheet": one grouped list, destructive last. */}
        <ListGroup>
          {isOwner ? (
            <>
              <Row
                compact
                leading={<UserRoundPlus className={icon} aria-hidden />}
                title={t("menu.addGuest")}
                onClick={onAddGuest}
              />
              <Row
                compact
                leading={<Pencil className={icon} aria-hidden />}
                title={t("menu.rename")}
                onClick={() => setStep("rename")}
              />
              <Row
                compact
                className="text-negative"
                leading={<Trash2 className={icon} aria-hidden />}
                title={t("menu.delete")}
                onClick={() => setStep("delete")}
              />
            </>
          ) : (
            <Row
              compact
              className="text-negative"
              leading={<LogOut className={icon} aria-hidden />}
              title={t("menu.leave")}
              onClick={() => setStep("leave")}
            />
          )}
        </ListGroup>
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
        disabled={!online}
        onClose={close}
        onConfirm={async () => {
          onLeaving();
          // APP-9: waits for the server (it first reads the trip's expenses there, to delete them all).
          await deleteTrip(trip);
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
          // APP-9: off my trips at once (Home's list drops it locally); a refusal comes back as a notice.
          leaveTrip(trip).catch(() => showToast(t("common.notSaved")));
          showToast(t("leave.done", { trip: trip.name }));
          onLeft();
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
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const check = checkTripName(name);
        if (!check.ok) return setError(t(check.error === "empty" ? "tripName.empty" : "tripName.tooLong"));
        if (check.name === view.trip.name) return onDone();
        // APP-9: renamed on screen at once; a refusal comes back as a notice.
        renameTrip(view.trip, check.name).catch(() => showToast(t("common.notSaved")));
        onDone();
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
      <Button type="submit" variant="primary" className="w-full" disabled={!online}>
        {t("common.save")}
      </Button>
    </form>
  );
}
