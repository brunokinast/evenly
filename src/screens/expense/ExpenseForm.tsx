import { useEffect, useMemo, useRef, useState } from "react";
import { backToTrip } from "@/app/nav";
import { useLocation } from "wouter";
import { ChevronRight, Trash2, X } from "lucide-react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Button } from "@/components/Button";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { guardBack } from "@/components/Sheet";
import { IconButton } from "@/components/IconButton";
import { ListGroup } from "@/components/List";
import { MoneyInput } from "@/components/MoneyInput";
import { TopBar } from "@/components/TopBar";
import { deleteExpense, saveExpense } from "@/data/commands";
import { useMe } from "@/data/session";
import { useExpenses, useTrip } from "@/data/trips";
import { people as peopleOf } from "@/domain/members";
import { equalShares } from "@/domain/split";
import { checkDraft, draftInput, draftOf, newDraft, withCents, type ExpenseDraft } from "@/domain/draft";
import type { Expense, Trip } from "@/domain/types";
import { money, t } from "@/i18n";
import { cn } from "@/lib/cn";
import { mark, usePaintedMark } from "@/lib/perf";
import { NotFound } from "../NotFound";
import {
  DRAFT_FIELDS,
  DraftSheets,
  fieldViews,
  isDraftField,
  nameIn,
  type DraftField,
  type FieldView,
} from "./fields";

/** Add (expenseId undefined) or Edit expense: one full screen (EXP flow 3–6). */
export function ExpenseFormScreen({ tripId, expenseId }: { tripId: string; expenseId?: string }) {
  const me = useMe();
  const trip = useTrip(tripId);
  const expenses = useExpenses(tripId);
  usePaintedMark("painted:form", trip.status === "ready" && expenses.status === "ready");
  const [, navigate] = useLocation();
  const existing =
    expenseId && expenses.status === "ready" ? expenses.data.find((e) => e.id === expenseId) : undefined;
  const deleted = !!expenseId && expenses.status === "ready" && !existing;

  // Deleted (by me from this screen, or by someone else meanwhile): back to the trip.
  useEffect(() => {
    if (deleted) void backToTrip(navigate, tripId);
  }, [deleted, navigate, tripId]);

  if (trip.status === "gone") return <NotFound />;
  if (trip.status === "loading" || (expenseId && expenses.status !== "ready") || deleted) return null;
  return <ExpenseForm key={expenseId ?? "new"} trip={trip.data} existing={existing} myUid={me.uid} />;
}

type SheetName = DraftField | "discard" | "delete" | null;

function ExpenseForm({ trip, existing, myUid }: { trip: Trip; existing?: Expense; myUid: string }) {
  const online = useOnline();
  const [, navigate] = useLocation();
  const myId = trip.memberIdsByUid[myUid] ?? "";
  const [start] = useState(() =>
    existing ? draftOf(trip, myId, existing) : newDraft(trip, myId, Date.now()),
  );
  const [f, setF] = useState<ExpenseDraft>(start);
  const [sheet, setSheet] = useState<SheetName>(null);
  const sent = useRef(false);
  const descRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const people = useMemo(() => peopleOf(trip, myUid), [trip, myUid]);
  const cur = trip.currency;

  const { parts, isCustom, remaining, valid } = checkDraft(trip, f);
  const dirty = JSON.stringify(f) !== JSON.stringify(start);
  const ctx = { trip, people, myId };
  const views = fieldViews(ctx, f, start.spentAt);

  const leave = () => void backToTrip(navigate, trip.id);

  // Expenses flow 5: Back (Android, browser) with unsaved changes asks first, like the close button.
  useEffect(() => (dirty ? guardBack(() => setSheet("discard")) : undefined), [dirty]);

  // EXP-9: some mobile browsers ignore autoFocus after navigation; focus the amount once mounted.
  useEffect(() => {
    if (!existing && document.activeElement !== amountRef.current) amountRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // EXP-8: Firestore applies the write locally at once (the trip lists it in a few ms) and syncs it in the
  // background, so the form leaves right away; only a refusal by the server comes back, as a notice.
  function save() {
    if (!valid || sent.current || !online) return;
    const input = draftInput(trip, f);
    if (!input) return;
    sent.current = true;
    const { description } = input;
    mark("save:tap");
    saveExpense(trip.id, input, existing).then(
      () => mark("save:confirmed"),
      () => showToast(t("form.notSaved", { description })),
    );
    showToast(t(existing ? "form.updated" : "form.added"));
    leave();
  }

  // EXP-7 hint: "Each person pays X" (equal split only).
  let hint = "";
  if (f.cents && !isCustom && parts.length) {
    // From the shares Save would write (BAL-2), so the hint can't drift from them.
    const shares = equalShares(f.cents, parts, f.payerId);
    const base = Math.min(...parts.map((id) => shares[id]!));
    const to = parts.find((id) => shares[id]! > base);
    hint = to
      ? t("form.eachPaysExtra", {
          amount: money(base, cur),
          extra: money(shares[to]! - base, cur),
          name: nameIn(ctx, to),
        })
      : t("form.eachPays", { amount: money(base, cur) });
  }

  return (
    <div className="mx-auto flex h-full max-w-app flex-col">
      <TopBar
        leading={
          <IconButton label={t("common.close")} onClick={() => (dirty ? setSheet("discard") : leave())}>
            <X />
          </IconButton>
        }
        title={t(existing ? "form.edit" : "form.new")}
        actions={
          existing && (
            <IconButton label={t("form.delete")} onClick={() => setSheet("delete")} disabled={!online}>
              <Trash2 />
            </IconButton>
          )
        }
      />
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="flex flex-col items-center gap-1 pt-5 pb-2">
          <span className="sr-only">{t("form.amount")}</span>
          <MoneyInput
            ref={amountRef}
            // EXP-9: Add focuses the amount; Edit opens without the keyboard (nothing to guess).
            autoFocus={!existing}
            enterKeyHint="next"
            cents={f.cents}
            format={(c) => money(c, cur)}
            zero
            onCents={(cents) => {
              const next = withCents(f, cents);
              if (next.splitReset) showToast(t("form.splitReset")); // EXP-13
              setF(next.draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                descRef.current?.focus(); // EXP-9
              }
            }}
            className={cn(
              "w-full min-w-0 bg-transparent text-center text-amount tracking-[-0.01em] caret-accent focus:outline-none",
              !f.cents && "text-fg-muted",
            )}
          />
          <span className="min-h-5 text-caption text-fg-muted">{hint}</span>
        </label>

        <input
          ref={descRef}
          value={f.description}
          onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))}
          placeholder={t("form.description")}
          aria-label={t("form.description")}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="done"
          onKeyDown={(e) => {
            // EXP-9: Enter closes the keyboard so Paid by, Split and When are in view; Save saves.
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="min-h-12 w-full rounded-ctl border border-transparent bg-surface-2 px-3.5 text-body placeholder:text-fg-muted focus:border-accent focus:outline-none"
        />

        <ListGroup>
          {DRAFT_FIELDS.map((field) => (
            <Setting key={field} view={views[field]} onClick={() => setSheet(field)} />
          ))}
        </ListGroup>

        {parts.length === 0 && <p className="text-caption text-negative">{t("form.needPeople")}</p>}
        {isCustom && remaining !== 0 && !!f.cents && (
          <p className="text-caption text-negative">
            {remaining > 0
              ? t("form.remainingError", { amount: money(remaining, cur) })
              : t("form.overError", { amount: money(-remaining, cur) })}
          </p>
        )}
      </form>

      <div className="bottom-bar">
        <Button variant="primary" className="w-full" disabled={!valid || !online} onClick={save}>
          {t("common.save")}
        </Button>
      </div>

      <DraftSheets
        {...ctx}
        open={isDraftField(sheet) ? sheet : null}
        draft={f}
        onChange={(patch) => setF((x) => ({ ...x, ...patch }))}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        open={sheet === "discard"}
        title={t("form.discardTitle")}
        body={t("form.discardBody")}
        confirm={t("form.discard")}
        cancel={t("form.keepEditing")}
        onClose={() => setSheet(null)}
        onConfirm={async () => leave()}
      />
      {existing && (
        <ConfirmSheet
          open={sheet === "delete"}
          title={t("form.deleteTitle")}
          body={t("form.deleteBody")}
          confirm={t("form.delete")}
          disabled={!online}
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            // EXP-8: gone locally at once (the screen then leaves); a refusal comes back as a notice.
            const description = existing.description;
            deleteExpense(trip.id, existing.id).catch(() => showToast(t("form.notDeleted", { description })));
            showToast(t("form.deleted"));
          }}
        />
      )}
    </div>
  );
}

/** One row of the settings list: icon, label, value (accent when not the default), chevron. */
function Setting({ view, onClick }: { view: FieldView; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-2.5 pr-3 pl-3.5 text-left active:bg-surface-2 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-fg-muted"
    >
      {view.icon}
      <span className="shrink-0 text-fg-muted">{view.label}</span>
      <span
        className={cn("min-w-0 flex-1 truncate text-right font-semibold", view.changed && "text-accent-text")}
      >
        {view.value}
      </span>
      <ChevronRight />
    </button>
  );
}
