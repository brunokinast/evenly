import { useMemo, useState } from "react";
import { ArrowRight, CircleCheck, FileDown } from "lucide-react";
import { showToast } from "@/app/toast";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { GroupHeader, IconTile, ListGroup, Row } from "@/components/List";
import { balances, paymentsInListOrder, totalSpent, type Payment } from "@/domain/balances";
import { byListOrder } from "@/domain/members";
import { locale, money, t } from "@/i18n";
import { cn } from "@/lib/cn";
import { label, who } from "./labels";
import type { TripView } from "./TripScreen";

/** Balances tab (BAL-1..8, PDF): stats, balances, your payments, other payments, export. */
export function BalancesTab({ view }: { view: TripView }) {
  const { trip, expenses } = view;
  const cur = trip.currency;
  const [exporting, setExporting] = useState(false);
  const { bal, pays } = useMemo(() => {
    const order = trip.members.map((m) => m.id);
    const bal = balances(order, expenses);
    return { bal, pays: paymentsInListOrder(bal, order, view.listed) };
  }, [trip.members, expenses, view.listed]);

  const total = totalSpent(expenses);
  const mine = pays.filter((p) => p.from === view.myMemberId || p.to === view.myMemberId);
  const others = pays.filter((p) => p.from !== view.myMemberId && p.to !== view.myMemberId);
  // BAL-6: the MEM-6 order; former members (still in old expenses) after members.
  const rows = [...bal.keys()].sort(byListOrder(view.listed));

  async function exportPdf() {
    setExporting(true);
    try {
      const { exportTripPdf } = await import("./pdf/exportPdf");
      await exportTripPdf(view);
    } catch {
      showToast(t("balances.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat k={t("balances.total")} v={money(total, cur)} />
        <Stat k={t("balances.perPerson")} v={money(Math.round(total / trip.members.length), cur)} />
        <Stat k={t("balances.expenses")} v={expenses.length.toLocaleString(locale)} />
        <Stat k={t("trip.tab.members")} v={trip.members.length.toLocaleString(locale)} />
      </div>

      <section>
        <GroupHeader>{t("balances.balances")}</GroupHeader>
        <ListGroup>
          {rows.map((id) => {
            const v = bal.get(id)!;
            const p = who(view, id);
            return (
              <Row
                key={id}
                leading={<Avatar id={id} name={p.name} guest={p.guest} />}
                title={label(view, id)}
                trailing={
                  <span
                    className={cn(
                      "flex shrink-0 flex-col items-end text-row",
                      v > 0 ? "text-positive" : v < 0 ? "text-negative" : "text-fg-muted",
                    )}
                  >
                    {v !== 0 && (
                      <small className="text-tag font-medium normal-case text-fg-muted">
                        {t(v > 0 ? "balances.getsBack" : "balances.owes")}
                      </small>
                    )}
                    {v === 0 ? t("balances.settled") : money(Math.abs(v), cur)}
                  </span>
                }
              />
            );
          })}
        </ListGroup>
      </section>

      {pays.length === 0 ? (
        <ListGroup>
          <Row leading={<CheckTile />} title={t("balances.allSettled")} wrap />
        </ListGroup>
      ) : (
        <section>
          <GroupHeader>{t("balances.yours")}</GroupHeader>
          <ListGroup>
            {mine.length ? (
              mine.map((p, i) => (
                <PaymentRow
                  key={i}
                  view={view}
                  p={p}
                  tone={p.from === view.myMemberId ? "negative" : "positive"}
                />
              ))
            ) : (
              <Row compact leading={<CheckTile />} title={t("balances.settledUp")} />
            )}
          </ListGroup>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <GroupHeader>{t("balances.others")}</GroupHeader>
          <ListGroup>
            {others.map((p, i) => (
              <PaymentRow key={i} view={view} p={p} tone="neutral" />
            ))}
          </ListGroup>
        </section>
      )}

      <Button
        variant="quiet"
        size="sm"
        className="self-center"
        busy={exporting}
        onClick={() => void exportPdf()}
      >
        <FileDown aria-hidden />
        {t("balances.export")}
      </Button>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-card border border-border bg-surface px-3 py-2.5">
      <span className="truncate text-tag font-normal text-fg-muted">{k}</span>
      <span className="truncate text-heading">{v}</span>
    </div>
  );
}

function CheckTile() {
  return (
    <IconTile small>
      <CircleCheck />
    </IconTile>
  );
}

/** BAL-8: "You pay Ana" in the owes color, "Ana pays you" in the gets-back color, others neutral. */
function PaymentRow({
  view,
  p,
  tone,
}: {
  view: TripView;
  p: Payment;
  tone: "positive" | "negative" | "neutral";
}) {
  const from = who(view, p.from);
  const to = who(view, p.to);
  const text =
    p.from === view.myMemberId
      ? t("balances.youPay", { name: to.name })
      : p.to === view.myMemberId
        ? t("balances.paysYou", { name: from.name })
        : t("balances.pays", { from: from.name, to: to.name });
  return (
    <Row
      compact
      wrap
      leading={
        <span className="flex shrink-0 items-center gap-0.5 text-fg-muted" aria-hidden>
          <Avatar id={from.id} name={from.name} size="sm" guest={from.guest} />
          <ArrowRight className="size-4" />
          <Avatar id={to.id} name={to.name} size="sm" guest={to.guest} />
        </span>
      }
      title={text}
      trailing={
        <span
          className={cn(
            "shrink-0 text-row",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative",
          )}
        >
          {money(p.cents, view.trip.currency)}
        </span>
      }
    />
  );
}
