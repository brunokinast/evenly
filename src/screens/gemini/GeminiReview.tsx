import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { handleEvents, postpone, useCalendarInbox } from "@/app/calendarInbox";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Button, ButtonRow } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { GroupHeader } from "@/components/List";
import { Sheet } from "@/components/Sheet";
import { TRIP_ICON } from "@/components/TripIcon";
import { addExpenses } from "@/data/commands";
import { checkDraft, draftInput, withCents, withTrip, type ExpenseDraft } from "@/domain/draft";
import { readEvent, type GuessField } from "@/domain/intake";
import { people as peopleOf, type Person } from "@/domain/members";
import type { Trip } from "@/domain/types";
import { money, t, tn } from "@/i18n";
import { cn } from "@/lib/cn";
import { DRAFT_FIELDS, DraftSheets, fieldViews, isDraftField, type DraftField } from "../expense/fields";
import { AmountSheet, TripSheet } from "./ReviewSheets";

/** What the user changed on a line (AST-6); dropped by "Later" (AST-10). */
type Edit = { tripId: string; draft: ExpenseDraft; confirmed: GuessField[] };

type Line = {
  eventId: string;
  title: string;
  trip: Trip;
  myId: string;
  people: Map<string, Person>;
  draft: ExpenseDraft;
  /** Fields still marked as a guess (AST-7). */
  guesses: GuessField[];
  valid: boolean;
};

type Picker = DraftField | "amount" | "trip";

/** AST-7: the user opened these fields' pickers and confirmed them, so they're no longer guesses. */
const confirm = (e: Edit, ...fields: GuessField[]): Edit => ({
  ...e,
  confirmed: [...e.confirmed, ...fields],
});

/** The "From Gemini" sheet over Home (specs/features/assistant.md). `trips` in Home's order. */
export function GeminiReview({ trips, myUid }: { trips: Trip[]; myUid: string }) {
  const inbox = useCalendarInbox();
  const online = useOnline();
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);

  // AST-4: the default trip is the most recently active one when the review opens; kept for the visit, so
  // lines don't jump to the trip that "Add" (or another member) just made the most recent.
  const [pinned, setPinned] = useState({ visit: -1, tripId: "" });
  if (pinned.visit !== inbox.visit) setPinned({ visit: inbox.visit, tripId: trips[0]?.id ?? "" });
  const read = useMemo(() => {
    const first = trips.find((x) => x.id === pinned.tripId);
    const byDefault = first ? [first, ...trips.filter((x) => x !== first)] : trips;
    const opts = { now: inbox.readAt, fallbackDescription: t("gemini.fallbackDescription") };
    return inbox.events.flatMap((ev) => readEvent(ev, byDefault, myUid, opts) ?? []);
  }, [inbox.events, inbox.readAt, trips, pinned.tripId, myUid]);

  const peopleByTrip = useMemo(() => new Map(trips.map((x) => [x.id, peopleOf(x, myUid)])), [trips, myUid]);

  const lines: Line[] = read.flatMap((p) => {
    // An edit whose trip is gone (deleted, or I was removed) no longer applies: back to what Gemini wrote.
    const edited = edits[p.eventId];
    const edit = edited && trips.some((x) => x.id === edited.tripId) ? edited : undefined;
    const trip = trips.find((x) => x.id === (edit?.tripId ?? p.tripId));
    if (!trip) return [];
    const draft = edit?.draft ?? p.draft;
    return {
      eventId: p.eventId,
      title: p.title,
      trip,
      myId: trip.memberIdsByUid[myUid] ?? "",
      people: peopleByTrip.get(trip.id)!,
      draft,
      guesses: p.guesses.filter((g) => !edit?.confirmed.includes(g)),
      valid: checkDraft(trip, draft).valid,
    };
  });

  const open = lines.length > 0 && !inbox.postponed;
  const current = lines.find((l) => l.eventId === openId) ?? null;
  const ready = lines.filter((l) => l.valid);

  // From the latest state: one tap can send two changes (a new payer, then "confirmed").
  function change(line: Line, next: (e: Edit) => Edit) {
    const start: Edit = { tripId: line.trip.id, draft: line.draft, confirmed: [] };
    setEdits((all) => ({ ...all, [line.eventId]: next(all[line.eventId] ?? start) }));
  }

  function addAll() {
    if (!online || ready.length === 0) return;
    const items = ready.map((l) => ({ tripId: l.trip.id, input: draftInput(l.trip, l.draft)! }));
    // AST-10, like EXP-8: on screen at once; only a refusal by the server comes back.
    addExpenses(items).catch(() => showToast(t("gemini.notSaved")));
    showToast(tn("gemini.added", items.length));
    setOpenId(null);
    void handleEvents(ready.map((l) => l.eventId));
  }

  function later() {
    postpone();
    setEdits({});
    setOpenId(null);
  }

  const groups = trips.flatMap((trip) => {
    const of = lines.filter((l) => l.trip.id === trip.id);
    return of.length ? [{ trip, lines: of }] : [];
  });

  return (
    <>
      <Sheet
        open={open}
        onClose={later}
        title={`${t("gemini.title")} · ${lines.length}`}
        subtitle={t("gemini.subtitle")}
        focusField={false}
      >
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.trip.id}>
              <GroupHeader>{g.trip.name}</GroupHeader>
              <div className="overflow-hidden rounded-card bg-surface-2">
                {g.lines.map((line) => (
                  <ReviewLine
                    key={line.eventId}
                    line={line}
                    open={line.eventId === openId}
                    onToggle={() => setOpenId((id) => (id === line.eventId ? null : line.eventId))}
                    onDescription={(description) =>
                      change(line, (e) => ({ ...e, draft: { ...e.draft, description } }))
                    }
                    onPick={setPicker}
                    onRemove={() => void handleEvents([line.eventId])}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <ButtonRow>
          <Button variant="secondary" onClick={later}>
            {t("gemini.later")}
          </Button>
          <Button variant="primary" disabled={!online || ready.length === 0} onClick={addAll}>
            {ready.length ? tn("gemini.add", ready.length) : t("gemini.nothingToAdd")}
          </Button>
        </ButtonRow>
      </Sheet>

      {current && (
        <LinePickers
          line={current}
          trips={trips}
          myUid={myUid}
          picker={open ? picker : null}
          onChange={(next) => change(current, next)}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

/** The opened line's pickers: the shared expense fields plus amount and trip (AST-6, AST-7, AST-8). */
function LinePickers(p: {
  line: Line;
  trips: Trip[];
  myUid: string;
  picker: Picker | null;
  onChange: (next: (e: Edit) => Edit) => void;
  onClose: () => void;
}) {
  const { line } = p;
  return (
    <>
      <DraftSheets
        trip={line.trip}
        people={line.people}
        myId={line.myId}
        open={isDraftField(p.picker) ? p.picker : null}
        draft={line.draft}
        onChange={(patch) => p.onChange((e) => ({ ...e, draft: { ...e.draft, ...patch } }))}
        onClose={(field, confirmed) => {
          if (confirmed && field !== "when") p.onChange((e) => confirm(e, field));
          p.onClose();
        }}
      />
      <AmountSheet
        open={p.picker === "amount"}
        trip={line.trip}
        cents={line.draft.cents}
        onDone={(cents) => {
          const next = withCents(line.draft, cents);
          if (next.splitReset) showToast(t("form.splitReset")); // EXP-13
          p.onChange((e) => ({ ...e, draft: next.draft }));
          p.onClose();
        }}
        onClose={p.onClose}
      />
      <TripSheet
        open={p.picker === "trip"}
        trips={p.trips}
        value={line.trip.id}
        onPick={(tripId) => {
          const trip = p.trips.find((x) => x.id === tripId)!;
          p.onChange((e) =>
            tripId === e.tripId
              ? confirm(e, "trip")
              : // AST-8: payer and split are back to the defaults, so nothing about them is a guess anymore.
                confirm(
                  { ...e, tripId, draft: withTrip(e.draft, trip, trip.memberIdsByUid[p.myUid] ?? "") },
                  "trip",
                  "payer",
                  "split",
                ),
          );
          p.onClose();
        }}
        onClose={p.onClose}
      />
    </>
  );
}

/** One expense: a compact line; opened, its description, chips and Remove (AST-6). */
function ReviewLine(p: {
  line: Line;
  open: boolean;
  onToggle: () => void;
  onDescription: (description: string) => void;
  onPick: (picker: Picker) => void;
  onRemove: () => void;
}) {
  const { line } = p;
  const { trip, draft } = line;
  const ctx = { trip, people: line.people, myId: line.myId };
  const views = fieldViews(ctx, draft, draft.spentAt);
  const c = checkDraft(trip, draft);
  const who = c.allIn ? t("gemini.all") : views.split.short;
  const amount = draft.cents ? money(draft.cents, trip.currency) : "—";
  const TripIcon = TRIP_ICON[trip.icon];
  return (
    <div className={cn("border-border not-first:border-t", p.open && "bg-surface")}>
      <button
        type="button"
        aria-expanded={p.open}
        onClick={p.onToggle}
        className="flex min-h-13 w-full items-center gap-2 px-3 text-left"
      >
        {(!line.valid || line.guesses.length > 0) && (
          <span
            aria-label={t(line.valid ? "gemini.needsLook" : "gemini.needsFix")}
            className={cn("size-2 shrink-0 rounded-full", line.valid ? "bg-accent" : "bg-negative")}
          />
        )}
        <span className="min-w-0 shrink truncate text-row">{draft.description || "—"}</span>
        <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">{who}</span>
        <span className={cn("shrink-0 text-row", !draft.cents && "text-negative")}>{amount}</span>
      </button>
      {p.open && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <input
            value={draft.description}
            onChange={(e) => p.onDescription(e.target.value)}
            aria-label={t("form.description")}
            placeholder={t("form.description")}
            maxLength={100}
            autoComplete="off"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="min-h-11 w-full rounded-ctl border border-transparent bg-surface-2 px-3 text-row placeholder:font-normal placeholder:text-fg-muted focus:border-accent focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <Chip
              tone={draft.cents ? "plain" : "missing"}
              aria-label={t("form.amount")}
              onClick={() => p.onPick("amount")}
            >
              {draft.cents ? amount : t("gemini.amountMissing")}
            </Chip>
            <Chip
              tone={line.guesses.includes("trip") ? "guess" : "plain"}
              icon={<TripIcon />}
              aria-label={t("gemini.trip")}
              onClick={() => p.onPick("trip")}
            >
              {trip.name}
            </Chip>
            {DRAFT_FIELDS.map((field) => (
              <Chip
                key={field}
                tone={field !== "when" && line.guesses.includes(field) ? "guess" : "plain"}
                icon={views[field].icon}
                aria-label={views[field].label}
                onClick={() => p.onPick(field)}
              >
                {views[field].short}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-caption text-fg-muted italic">“{line.title}”</p>
            <Button variant="destructive" className="shrink-0 px-2" onClick={p.onRemove}>
              <Trash2 aria-hidden />
              {t("gemini.remove")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
