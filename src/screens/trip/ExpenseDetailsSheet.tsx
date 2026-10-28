import { useLocation } from "wouter";
import { openExpenseForm } from "@/app/nav";
import { Pencil } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { GroupHeader, ListGroup, Row } from "@/components/List";
import { Sheet } from "@/components/Sheet";
import type { Expense } from "@/domain/types";
import { money, t, whenLabel } from "@/i18n";
import { label, splitLabel, who } from "./labels";
import type { TripView } from "./TripScreen";

/** EXP flow 2: reading an expense; Edit opens the edit screen (EXP-15). */
export function ExpenseDetailsSheet({
  view,
  expense,
  onClose,
}: {
  view: TripView;
  expense: Expense | null;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const e = expense;
  const cur = view.trip.currency;
  // MEM-6 order: members in the split or who paid; former members after them.
  const ids = e
    ? [
        ...view.listed.filter((id) => id in e.shares || id === e.payerId),
        ...[...Object.keys(e.shares), e.payerId].filter((id) => !view.people.has(id)),
      ].filter((id, i, all) => all.indexOf(id) === i)
    : [];
  const myShare = e?.shares[view.myMemberId];

  return (
    <Sheet
      open={e !== null}
      onClose={onClose}
      title={e?.description ?? ""}
      subtitle={e ? whenLabel(e.spentAt) : undefined}
      action={
        e && (
          <Button
            size="sm"
            onClick={() => void openExpenseForm(navigate, `/trip/${view.trip.id}/expense/${e.id}/edit`)}
          >
            <Pencil aria-hidden />
            {t("common.edit")}
          </Button>
        )
      }
    >
      {e && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[34px] leading-10 font-bold">{money(e.amountCents, cur)}</span>
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-caption font-semibold text-accent-text">
              {myShare ? t("details.yourShare", { amount: money(myShare, cur) }) : t("details.notInSplit")}
            </span>
          </div>
          <section>
            <GroupHeader>{splitLabel(view, e)}</GroupHeader>
            <ListGroup>
              {ids.map((id) => {
                const p = who(view, id);
                return (
                  <Row
                    key={id}
                    compact
                    leading={<Avatar id={id} name={p.name} size="sm" guest={p.guest} />}
                    title={label(view, id)}
                    caption={
                      id === e.payerId ? (
                        <span className="text-positive">
                          {t("details.paid", { amount: money(e.amountCents, cur) })}
                        </span>
                      ) : undefined
                    }
                    trailing={
                      <span className="shrink-0 text-row">
                        {id in e.shares ? (
                          money(e.shares[id]!, cur)
                        ) : (
                          <span className="font-normal text-fg-muted">{t("details.notInSplitRow")}</span>
                        )}
                      </span>
                    }
                  />
                );
              })}
            </ListGroup>
          </section>
        </>
      )}
    </Sheet>
  );
}
