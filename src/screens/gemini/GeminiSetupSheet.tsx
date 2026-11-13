import { useEffect, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { recheckInbox, requestCalendarAccess, useCalendarInbox } from "@/app/calendarInbox";
import { showToast } from "@/app/toast";
import { Button, buttonClass } from "@/components/Button";
import { Sheet } from "@/components/Sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/cn";

const NEW_CALENDAR = "https://calendar.google.com/calendar/r/settings/createcalendar";

/** AST-1: the one-time guide, from Profile (Android app only). */
export function GeminiSetupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inbox = useCalendarInbox();
  useEffect(() => {
    if (open) void recheckInbox();
  }, [open]);
  const allowed = inbox.access === "granted";
  const skill = t("gemini.skillText");
  return (
    <Sheet open={open} onClose={onClose} title={t("gemini.setupTitle")} focusField={false}>
      <p className="text-caption text-fg-muted">{t("gemini.setupIntro")}</p>
      <ol className="flex flex-col gap-4">
        <Step n={1} text={t("gemini.step1")}>
          <a href={NEW_CALENDAR} target="_blank" rel="noopener" className={buttonClass("secondary")}>
            <ExternalLink aria-hidden />
            {t("gemini.openCalendar")}
          </a>
        </Step>
        <Step n={2} text={t("gemini.step2")}>
          <p className="max-h-36 overflow-y-auto rounded-card bg-surface-2 px-3.5 py-2.5 text-caption">
            {skill}
          </p>
          <Button
            onClick={() =>
              void navigator.clipboard.writeText(skill).then(
                () => showToast(t("gemini.copied")),
                () => showToast(t("common.error")),
              )
            }
          >
            <Copy aria-hidden />
            {t("gemini.copy")}
          </Button>
        </Step>
        <Step n={3} text={t("gemini.step3")}>
          <Button disabled={allowed} onClick={() => void requestCalendarAccess()}>
            {allowed && <Check aria-hidden />}
            {t(allowed ? "gemini.allowed" : "gemini.allow")}
          </Button>
          {inbox.access === "denied" && (
            <p className="text-caption text-negative">{t("gemini.deniedHint")}</p>
          )}
        </Step>
      </ol>
      {allowed && (
        <p className={cn("text-caption", inbox.found ? "text-positive" : "text-fg-muted")} aria-live="polite">
          {t(inbox.found ? "gemini.found" : "gemini.notFound")}
        </p>
      )}
      <Button variant="primary" className="w-full" onClick={onClose}>
        {t("common.done")}
      </Button>
    </Sheet>
  );
}

function Step({ n, text, children }: { n: number; text: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-caption font-bold">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <span>{text}</span>
        {children}
      </div>
    </li>
  );
}
