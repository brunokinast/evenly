import { useState } from "react";
import { Receipt } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState, GroupHeader, IconTile, ListGroup, Row } from "@/components/List";
import { totalSpent } from "@/domain/balances";
import { groupByDay } from "@/domain/dates";
import { dayLabel, money, t, timeLabel, tn } from "@/i18n";
import { cn } from "@/lib/cn";
import { ExpenseDetailsSheet } from "./ExpenseDetailsSheet";
import { label, splitLabel, who } from "./labels";
import type { TripView } from "./TripScreen";

/** EXP flow 1, EXP-14, EXP-15. */
export function ExpensesTab({ view }: { view: TripView }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { expenses, trip } = view;
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={
          <IconTile>
            <Receipt />
          </IconTile>
        }
        text={t("expenses.empty")}
      />
    );
  }
  const open = expenses.find((e) => e.id === openId) ?? null;
  // APP-8: a long total steps down a size instead of breaking inside the number.
  const total = money(totalSpent(expenses), trip.currency);
  return (
    <>
      {/* specs/design.md "Trip total". */}
      <div className="flex flex-col items-center px-1 pt-2 pb-1 text-center">
        <span className="text-caption text-fg-muted">{t("expenses.total")}</span>
        <span className={cn("whitespace-nowrap", total.length > 11 ? "text-total" : "text-amount")}>
          {total}
        </span>
        <span className="text-caption text-fg-muted">{tn("expenses.count", expenses.length)}</span>
      </div>
      {groupByDay(expenses).map((group) => (
        <section key={group.day}>
          <GroupHeader>{dayLabel(group.items[0]!.spentAt)}</GroupHeader>
          <ListGroup>
            {group.items.map((e) => {
              const payer = who(view, e.payerId);
              return (
                <Row
                  key={e.id}
                  compact
                  leading={
                    <>
                      <Avatar id={payer.id} name={payer.name} size="sm" guest={payer.guest} />
                      <span className="sr-only">
                        {t("expenses.paidBy", { name: label(view, e.payerId) })}
                      </span>
                    </>
                  }
                  title={e.description}
                  caption={`${timeLabel(e.spentAt)} · ${splitLabel(view, e)}`}
                  trailing={<span className="shrink-0 text-row">{money(e.amountCents, trip.currency)}</span>}
                  onClick={() => setOpenId(e.id)}
                />
              );
            })}
          </ListGroup>
        </section>
      ))}
      <ExpenseDetailsSheet view={view} expense={open} onClose={() => setOpenId(null)} />
    </>
  );
}
