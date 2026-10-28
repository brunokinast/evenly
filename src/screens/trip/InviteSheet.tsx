import { useEffect, useRef, useState } from "react";
import { Copy, LoaderCircle, Share2 } from "lucide-react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";
import { createInvite } from "@/data/commands";
import type { Trip } from "@/domain/types";
import { t } from "@/i18n";

/** INV-1, INV-2, INV-8: shows the valid code (creating one on open if needed), Copy, Share, new code. */
export function InviteSheet({ open, trip, onClose }: { open: boolean; trip: Trip; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t("invite.title")}>
      {open && <InviteBody trip={trip} />}
    </Sheet>
  );
}

function InviteBody({ trip }: { trip: Trip }) {
  const online = useOnline();
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const creating = useRef(false);
  const invite = trip.invite && trip.invite.expiresAt > now ? trip.invite : null;

  async function generate() {
    if (creating.current) return;
    creating.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await createInvite(trip);
    } catch {
      setFailed(true);
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }

  // A code exists only after the owner opens Invite (INV-2); an expired one is replaced while open.
  // Once per stale code, so a write still on its way isn't repeated.
  const autoFor = useRef<string | null>(null);
  useEffect(() => {
    const stale = trip.invite?.code ?? "none";
    if (!invite && online && !failed && autoFor.current !== stale) {
      autoFor.current = stale;
      void generate();
    }
  });

  const code = invite?.code;
  const shareText = code ? t("invite.shareText", { trip: trip.name, code }) : "";
  const left = invite ? Math.max(0, Math.ceil((invite.expiresAt - now) / 1000)) : 0;
  const countdown = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <>
      <p className="text-center text-caption text-fg-muted">{t("invite.body", { trip: trip.name })}</p>
      {code && !busy ? (
        <>
          <p
            className="pt-2 text-center text-[40px] leading-[48px] font-bold tracking-[0.08em]"
            aria-label={t("invite.codeIs", { code: code.split("").join(" ") })}
          >
            {code.slice(0, 3)} {code.slice(3)}
          </p>
          <p className="text-center text-caption text-fg-muted">
            {t("invite.expiresIn", { time: countdown })}
          </p>
        </>
      ) : failed ? (
        <p role="alert" className="text-center text-caption text-negative">
          {t("common.error")}
        </p>
      ) : (
        <LoaderCircle className="mx-auto my-4 size-8 animate-spin text-fg-muted" aria-hidden />
      )}
      <div className="flex gap-2.5">
        <Button
          className="flex-1"
          disabled={!code || busy}
          onClick={() =>
            navigator.clipboard
              ?.writeText(code!)
              .then(() => showToast(t("invite.copied")))
              .catch(() => showToast(t("invite.codeIs", { code: code! })))
          }
        >
          <Copy aria-hidden />
          {t("invite.copy")}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={!code || busy}
          onClick={() => {
            if (navigator.share) void navigator.share({ text: shareText }).catch(() => {});
            else void navigator.clipboard?.writeText(shareText).then(() => showToast(t("invite.copied")));
          }}
        >
          <Share2 aria-hidden />
          {t("invite.share")}
        </Button>
      </div>
      <Button variant="quiet" disabled={busy || !online} onClick={() => void generate()}>
        {failed ? t("common.tryAgain") : t("invite.new")}
      </Button>
    </>
  );
}

/** Current time, ticking every second (for the countdown). */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
