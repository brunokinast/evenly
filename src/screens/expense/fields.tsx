import { Fragment, type ReactNode } from "react";
import { CalendarDays, Users, Wallet } from "lucide-react";
import { checkDraft, type ExpenseDraft } from "@/domain/draft";
import { listOrder, type Person } from "@/domain/members";
import type { Trip } from "@/domain/types";
import { t, timeLabel, whenLabel } from "@/i18n";
import { PayerSheet, SplitSheet, WhenSheet } from "./FormSheets";

/**
 * The expense fields set with a picker, defined once: the Add/Edit expense form shows them as labeled
 * rows, the Gemini review as chips (AST-6). A new field goes here, and the Record types below make
 * both places (and the pickers) handle it.
 */
export const DRAFT_FIELDS = ["payer", "split", "when"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];
export const isDraftField = (k: string | null): k is DraftField => DRAFT_FIELDS.includes(k as DraftField);

export type FieldView = {
  icon: ReactNode;
  label: string;
  /** For the form's rows: "Equally between all". */
  value: string;
  /** For chips: "Everyone", "You, Ana". */
  short: string;
  /** Differs from the default (shown in the accent color). */
  changed: boolean;
};

type Ctx = { trip: Trip; people: Map<string, Person>; myId: string };

/** A person's name as the pickers show it: "You" for me (MEM-6). */
export function nameIn(ctx: Ctx, id: string): string {
  return id === ctx.myId ? t("common.you") : (ctx.people.get(id)?.name ?? t("members.former"));
}

/** Every field's icon, label and value for this draft. `defaultSpentAt`: when "When" counts as unchanged. */
export function fieldViews(ctx: Ctx, d: ExpenseDraft, defaultSpentAt: number): Record<DraftField, FieldView> {
  const c = checkDraft(ctx.trip, d);
  const sameDay = new Date(d.spentAt).toDateString() === new Date().toDateString();
  return {
    payer: {
      icon: <Wallet />,
      label: t("form.paidBy"),
      value: c.payerOk ? nameIn(ctx, d.payerId) : "—",
      short: c.payerOk ? nameIn(ctx, d.payerId) : "—",
      changed: d.payerId !== ctx.myId,
    },
    split: {
      icon: <Users />,
      label: t("form.split"),
      value: c.isCustom
        ? t("form.custom")
        : c.allIn
          ? t("form.equallyAll")
          : t("form.equallyN", { n: c.parts.length }),
      short: c.isCustom
        ? t("form.custom")
        : c.allIn
          ? t("form.everyone")
          : listOrder(c.parts, ctx.myId) // MEM-6: me first
              .map((id) => nameIn(ctx, id))
              .join(", "),
      changed: !c.allIn,
    },
    when: {
      icon: <CalendarDays />,
      label: t("form.when"),
      value: whenLabel(d.spentAt),
      short: sameDay ? timeLabel(d.spentAt) : whenLabel(d.spentAt),
      changed: d.spentAt !== defaultSpentAt,
    },
  };
}

type SheetProps = Ctx & {
  open: boolean;
  draft: ExpenseDraft;
  onChange: (patch: Partial<ExpenseDraft>) => void;
  /** `confirmed`: picked or Done, rather than dismissed. */
  onClose: (confirmed: boolean) => void;
};

/** Each field's picker (the Record makes a new field need one). */
const SHEETS: Record<DraftField, (p: SheetProps) => ReactNode> = {
  payer: (p) => (
    <PayerSheet
      open={p.open}
      trip={p.trip}
      people={p.people}
      myId={p.myId}
      value={p.draft.payerId}
      onPick={(payerId) => {
        p.onChange({ payerId });
        p.onClose(true);
      }}
      onClose={() => p.onClose(false)}
    />
  ),
  split: (p) => (
    <SplitSheet
      open={p.open}
      trip={p.trip}
      people={p.people}
      myId={p.myId}
      cents={p.draft.cents ?? 0}
      payerId={p.draft.payerId}
      parts={checkDraft(p.trip, p.draft).parts}
      custom={p.draft.custom}
      typed={p.draft.typed}
      onChange={p.onChange}
      onDone={() => p.onClose(true)}
      onClose={() => p.onClose(false)}
    />
  ),
  when: (p) => (
    <WhenSheet
      open={p.open}
      value={p.draft.spentAt}
      onPick={(spentAt) => {
        p.onChange({ spentAt });
        p.onClose(true);
      }}
      onClose={() => p.onClose(false)}
    />
  ),
};

/**
 * The pickers of DRAFT_FIELDS, one open at a time. `onClose` says whether the field was confirmed, so the
 * review can clear its guess even when the value stayed the same (AST-7).
 */
export function DraftSheets(
  p: Ctx & {
    open: DraftField | null;
    draft: ExpenseDraft;
    onChange: (patch: Partial<ExpenseDraft>) => void;
    onClose: (field: DraftField, confirmed: boolean) => void;
  },
) {
  return DRAFT_FIELDS.map((field) => (
    <Fragment key={field}>
      {SHEETS[field]({ ...p, open: p.open === field, onClose: (confirmed) => p.onClose(field, confirmed) })}
    </Fragment>
  ));
}
