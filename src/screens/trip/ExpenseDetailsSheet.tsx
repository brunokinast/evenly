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
  // MEM-6 order, so my own share is the first row; former members after them.
  const ids = e
    ? [
        ...view.listed.filter((id) => id in e.shares),
        ...Object.keys(e.shares).filter((id) => !view.people.has(id)),
      ]
    : [];
  const payer = e ? who(view, e.payerId) : null;

  return (
    <Sheet
      open={e !== null}
      onClose={onClose}
      title={e?.description ?? ""}
      subtitle={e ? whenLabel(e.spentAt) : undefined}
    >
      {e && payer && (
        <>
          <div className="flex flex-col items-center gap-1.5 pt-1 pb-2 text-center">
            <span className="text-[34px] leading-10 font-bold">{money(e.amountCents, cur)}</span>
            <span className="flex max-w-full items-center gap-2 text-caption text-fg-muted">
              <Avatar id={payer.id} name={payer.name} size="sm" guest={payer.guest} />
              <span className="truncate">{t("details.paidBy", { name: label(view, e.payerId) })}</span>
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
                    trailing={<span className="shrink-0 text-row">{money(e.shares[id]!, cur)}</span>}
                  />
                );
              })}
            </ListGroup>
          </section>
          <Button
            className="w-full"
            onClick={() => void openExpenseForm(navigate, `/trip/${view.trip.id}/expense/${e.id}/edit`)}
          >
            <Pencil aria-hidden />
            {t("common.edit")}
          </Button>
        </>
      )}
    </Sheet>
  );
}
