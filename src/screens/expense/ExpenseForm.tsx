import { useEffect, useMemo, useRef, useState } from "react";
import { backToTrip } from "@/app/nav";
import { useLocation } from "wouter";
import { CalendarDays, ChevronRight, Trash2, Users, Wallet, X } from "lucide-react";
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
import { customShares, equalShares, withoutZeroShares } from "@/domain/split";
import type { Expense, Trip } from "@/domain/types";
import { money, t, whenLabel } from "@/i18n";
import { cn } from "@/lib/cn";
import { mark, usePaintedMark } from "@/lib/perf";
import { NotFound } from "../NotFound";
import { PayerSheet, SplitSheet, WhenSheet } from "./FormSheets";

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

type Form = {
  cents: number | null;
  description: string;
  payerId: string;
  /** Participants (member ids). */
  parts: string[];
  custom: boolean;
  /** Custom split: amounts typed per person (EXP-12). */
  typed: Record<string, number>;
  spentAt: number;
};

function initialForm(trip: Trip, myId: string, e?: Expense): Form {
  const ids = trip.members.map((m) => m.id);
  if (!e) {
    // EXP-10: paid by me, split equally between all, dated now.
    return {
      cents: null,
      description: "",
      payerId: myId,
      parts: ids,
      custom: false,
      typed: {},
      spentAt: Date.now(),
    };
  }
  const parts = ids.filter((id) => id in e.shares); // EXP-6: only current members
  return {
    cents: e.amountCents,
    description: e.description,
    payerId: ids.includes(e.payerId) ? e.payerId : myId,
    parts,
    custom: e.split === "custom",
    typed: e.split === "custom" ? Object.fromEntries(parts.map((id) => [id, e.shares[id]!])) : {},
    spentAt: e.spentAt,
  };
}

type SheetName = "payer" | "split" | "when" | "discard" | "delete" | null;

function ExpenseForm({ trip, existing, myUid }: { trip: Trip; existing?: Expense; myUid: string }) {
  const online = useOnline();
  const [, navigate] = useLocation();
  const myId = trip.memberIdsByUid[myUid] ?? "";
  const start = useMemo(() => initialForm(trip, myId, existing), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [f, setF] = useState<Form>(start);
  const [sheet, setSheet] = useState<SheetName>(null);
  const sent = useRef(false);
  const descRef = useRef<HTMLInputElement>(null);
  const people = useMemo(() => peopleOf(trip, myUid), [trip, myUid]);
  const cur = trip.currency;

  const order = trip.members.map((m) => m.id);
  // Participants in member order; members removed meanwhile drop out (EXP-6).
  const parts = order.filter((id) => f.parts.includes(id));
  const payerOk = order.includes(f.payerId);
  const isCustom = f.custom && Object.keys(f.typed).length > 0;
  const split = isCustom ? customShares(f.cents ?? 0, parts, f.typed, f.payerId) : null;
  const remaining = split?.remaining ?? 0;
  const valid =
    (f.cents ?? 0) > 0 && f.description.trim() !== "" && parts.length > 0 && payerOk && remaining === 0;
  const dirty =
    JSON.stringify({ ...f, spentAt: 0 }) !== JSON.stringify({ ...start, spentAt: 0 }) ||
    f.spentAt !== start.spentAt;

  const name = (id: string) =>
    id === myId ? t("common.you") : (people.get(id)?.name ?? t("members.former"));

  const leave = () => void backToTrip(navigate, trip.id);

  // Expenses flow 5: Back (Android, browser) with unsaved changes asks first, like the close button.
  useEffect(() => (dirty ? guardBack(() => setSheet("discard")) : undefined), [dirty]);

  // EXP-8: Firestore applies the write locally at once (the trip lists it in a few ms) and syncs it in the
  // background, so the form leaves right away; only a refusal by the server comes back, as a notice.
  function save() {
    if (!valid || sent.current || !online) return;
    sent.current = true;
    const cents = f.cents!;
    const shares = isCustom ? withoutZeroShares(split!.shares) : equalShares(cents, parts, f.payerId);
    const description = f.description.trim().slice(0, 100);
    mark("save:tap");
    saveExpense(
      trip.id,
      {
        description,
        amountCents: cents,
        payerId: f.payerId,
        shares,
        split: isCustom ? "custom" : "equal",
        spentAt: f.spentAt,
      },
      existing,
    ).then(
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
          name: name(to),
        })
      : t("form.eachPays", { amount: money(base, cur) });
  }

  const allIn = parts.length === order.length;
  const splitValue = isCustom
    ? t("form.custom")
    : allIn
      ? t("form.equallyAll")
      : t("form.equallyN", { n: parts.length });

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col">
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
            // EXP-9: Add focuses the amount; Edit opens without the keyboard (nothing to guess).
            autoFocus={!existing}
            enterKeyHint="next"
            cents={f.cents}
            format={(c) => money(c, cur)}
            zero
            onCents={(cents) => {
              // EXP-13: a new total resets a custom split to equal.
              if (isCustom && cents !== f.cents) showToast(t("form.splitReset"));
              setF((x) => ({
                ...x,
                cents,
                ...(isCustom && cents !== x.cents ? { custom: false, typed: {} } : {}),
              }));
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
          <Setting
            icon={<Wallet />}
            k={t("form.paidBy")}
            v={payerOk ? name(f.payerId) : "—"}
            changed={f.payerId !== myId}
            onClick={() => setSheet("payer")}
          />
          <Setting
            icon={<Users />}
            k={t("form.split")}
            v={splitValue}
            changed={!allIn || isCustom}
            onClick={() => setSheet("split")}
          />
          <Setting
            icon={<CalendarDays />}
            k={t("form.when")}
            v={whenLabel(f.spentAt)}
            changed={f.spentAt !== start.spentAt}
            onClick={() => setSheet("when")}
          />
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

      <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button variant="primary" className="w-full" disabled={!valid || !online} onClick={save}>
          {t("common.save")}
        </Button>
      </div>

      <PayerSheet
        open={sheet === "payer"}
        trip={trip}
        people={people}
        myId={myId}
        value={f.payerId}
        onPick={(payerId) => {
          setF((x) => ({ ...x, payerId }));
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <SplitSheet
        open={sheet === "split"}
        trip={trip}
        people={people}
        myId={myId}
        cents={f.cents ?? 0}
        payerId={f.payerId}
        parts={parts}
        custom={f.custom}
        typed={f.typed}
        onChange={(next) => setF((x) => ({ ...x, ...next }))}
        onClose={() => setSheet(null)}
      />
      <WhenSheet
        open={sheet === "when"}
        value={f.spentAt}
        onPick={(spentAt) => {
          setF((x) => ({ ...x, spentAt }));
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        open={sheet === "discard"}
        title={t("form.discardTitle")}
        body={t("form.discardBody")}
        confirm={t("form.discard")}
        cancel={t("form.keepEditing")}
        errorText={t("common.error")}
        onClose={() => setSheet(null)}
        onConfirm={async () => leave()}
      />
      {existing && (
        <ConfirmSheet
          open={sheet === "delete"}
          title={t("form.deleteTitle")}
          body={t("form.deleteBody")}
          confirm={t("form.delete")}
          cancel={t("common.cancel")}
          errorText={t("common.error")}
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
      {!existing && <FocusFirst />}
    </div>
  );
}

/** One row of the settings list: icon, label, value (accent when not the default), chevron. */
function Setting(props: {
  icon: React.ReactNode;
  k: string;
  v: string;
  changed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex min-h-12 w-full items-center gap-2.5 pr-3 pl-3.5 text-left active:bg-surface-2 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-fg-muted"
    >
      {props.icon}
      <span className="shrink-0 text-fg-muted">{props.k}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right font-semibold",
          props.changed && "text-accent-text",
        )}
      >
        {props.v}
      </span>
      <ChevronRight />
    </button>
  );
}

/** EXP-9: some mobile browsers ignore autoFocus after navigation; focus the amount once mounted. */
function FocusFirst() {
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>("input[inputmode=numeric]");
    if (el && document.activeElement !== el) el.focus();
  }, []);
  return null;
}
