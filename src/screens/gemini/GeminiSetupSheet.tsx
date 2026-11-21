import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Sparkles } from "lucide-react";
import { openGemini, recheckInbox, requestCalendarAccess, useCalendarInbox } from "@/app/calendarInbox";
import { showToast } from "@/app/toast";
import { Button, buttonClass } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
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
  const [byHand, setByHand] = useState(false);
  const name = t("gemini.skillName");
  const description = t("gemini.skillDescription");
  const instructions = t("gemini.skillText");
  const create = async () => {
    if (await openGemini(t("gemini.createPrompt", { name, description, instructions }))) return;
    setByHand(true);
    showToast(t("gemini.noApp"));
  };
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
          <Button onClick={() => void create()}>
            <Sparkles aria-hidden />
            {t("gemini.createSkill")}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            className="self-start px-0"
            aria-expanded={byHand}
            onClick={() => setByHand(!byHand)}
          >
            {t("gemini.byHand")}
            <ChevronDown aria-hidden className={cn("transition-transform", byHand && "rotate-180")} />
          </Button>
          {byHand && (
            <>
              <p className="text-caption text-fg-muted">{t("gemini.byHandHint")}</p>
              <SkillPart part="name" text={name} />
              <SkillPart part="description" text={description} />
              <SkillPart part="instructions" text={instructions} />
            </>
          )}
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

/** AST-1: Gemini picks a skill from its name and description alone, so each field is pasted on its own. */
function SkillPart({ part, text }: { part: "name" | "description" | "instructions"; text: string }) {
  const copy = () =>
    void navigator.clipboard.writeText(text).then(
      () => showToast(t("gemini.copied")),
      () => showToast(t("common.error")),
    );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-fg-muted">{t(`gemini.part.${part}`)}</span>
        <IconButton label={t(`gemini.copy.${part}`)} className="-my-2 text-fg-muted" onClick={copy}>
          <Copy aria-hidden />
        </IconButton>
      </div>
      <p
        className={cn(
          "rounded-card bg-surface-2 px-3.5 py-2.5 text-caption",
          part === "instructions" && "max-h-36 overflow-y-auto",
        )}
      >
        {text}
      </p>
    </div>
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
