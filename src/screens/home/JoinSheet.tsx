import { useState } from "react";
import { useLocation } from "wouter";
import { LoaderCircle } from "lucide-react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { Sheet } from "@/components/Sheet";
import { TripTile } from "@/components/TripIcon";
import { joinTrip, lookupInvite, TooManyAttempts, type InvitePreview } from "@/data/commands";
import { useMe } from "@/data/session";
import type { Trip } from "@/domain/types";
import { t } from "@/i18n";

type Props = { open: boolean; onClose: () => void; myTrips: Trip[] };

/** INV-3..7, MEM-7: enter a code, see the preview, optionally claim a guest, join. */
export function JoinSheet({ open, onClose, myTrips }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={t("join.title")}>
      {open && <JoinForm myTrips={myTrips} />}
    </Sheet>
  );
}

type Lookup =
  | { status: "idle" }
  | { status: "busy" }
  | { status: "error"; message: string }
  | { status: "found"; invite: InvitePreview };

function JoinForm({ myTrips }: { myTrips: Trip[] }) {
  const me = useMe();
  const online = useOnline();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [claim, setClaim] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(false);

  async function onCode(digits: string) {
    setCode(digits);
    setClaim(null);
    setJoinError(false);
    if (digits.length < 6) return setLookup({ status: "idle" });
    setLookup({ status: "busy" });
    try {
      const invite = await lookupInvite(digits);
      setLookup(invite ? { status: "found", invite } : { status: "error", message: t("join.invalid") });
    } catch (e) {
      setLookup({
        status: "error",
        message: t(e instanceof TooManyAttempts ? "join.tooMany" : "common.error"),
      });
    }
  }

  async function join(invite: InvitePreview) {
    setJoining(true);
    setJoinError(false);
    try {
      await joinTrip(invite, me.name, claim);
      showToast(t("join.joined", { trip: invite.name }));
      navigate(`/trip/${invite.tripId}`, { replace: true });
    } catch {
      setJoinError(true);
      setJoining(false);
    }
  }

  const found = lookup.status === "found" ? lookup.invite : null;
  const already = found && myTrips.some((trip) => trip.id === found.tripId);
  const claimName = found?.guests.find((g) => g.id === claim)?.name;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-fg-muted">{t("join.hint")}</p>
      <CodeInput value={code} onChange={(d) => void onCode(d)} label={t("join.code")} disabled={!online} />
      {lookup.status === "busy" && (
        <LoaderCircle className="mx-auto size-6 animate-spin text-fg-muted" aria-hidden />
      )}
      {lookup.status === "error" && (
        <p role="alert" className="text-caption text-negative">
          {lookup.message}
        </p>
      )}
      {found && (
        <>
          <div className="flex items-center gap-3 rounded-card border border-border p-3">
            <TripTile icon={found.icon} />
            <div className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate text-row">{found.name}</strong>
              <span className="text-caption text-fg-muted">{found.currency}</span>
            </div>
          </div>
          {already ? (
            <>
              <p className="text-caption text-fg-muted">{t("join.already", { trip: found.name })}</p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate(`/trip/${found.tripId}`, { replace: true })}
              >
                {t("join.open")}
              </Button>
            </>
          ) : (
            <>
              {found.guests.length > 0 && (
                <>
                  <p className="text-caption text-fg-muted">{t("join.claim")}</p>
                  <div role="group" aria-label={t("join.claim")} className="flex flex-wrap gap-2">
                    {found.guests.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        aria-pressed={claim === g.id}
                        onClick={() => setClaim(claim === g.id ? null : g.id)}
                        className="min-h-10 max-w-full truncate rounded-full bg-surface-2 px-3.5 text-caption font-semibold aria-pressed:bg-accent-soft aria-pressed:text-accent-text aria-pressed:outline-2 aria-pressed:-outline-offset-2 aria-pressed:outline-accent"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {joinError && (
                <p role="alert" className="text-caption text-negative">
                  {t("common.error")}
                </p>
              )}
              <Button
                variant="primary"
                className="w-full"
                busy={joining}
                disabled={!online}
                onClick={() => void join(found)}
              >
                <span className="truncate">
                  {claimName ? t("join.joinAs", { name: claimName }) : t("join.join")}
                </span>
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
