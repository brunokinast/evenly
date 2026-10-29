import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { goHome, openExpenseForm, switchTab } from "@/app/nav";
import { ChevronLeft, Ellipsis, Plus, Receipt, Scale, UserPlus, Users } from "lucide-react";
import { showToast } from "@/app/toast";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { SkeletonRows } from "@/components/List";
import { TopBar } from "@/components/TopBar";
import { TripTile } from "@/components/TripIcon";
import { useMe } from "@/data/session";
import { useExpenses, useTrip } from "@/data/trips";
import { usePaintedMark } from "@/lib/perf";
import { listOrder, people } from "@/domain/members";
import type { Expense, Trip } from "@/domain/types";
import { t } from "@/i18n";
import { cn } from "@/lib/cn";
import { NotFound } from "../NotFound";
import { BalancesTab } from "./BalancesTab";
import { ExpensesTab } from "./ExpensesTab";
import { InviteSheet } from "./InviteSheet";
import { MembersTab } from "./MembersTab";
import { TripMenu } from "./TripMenu";

export type Tab = "expenses" | "balances" | "members";
const TABS: { id: Tab; icon: typeof Receipt }[] = [
  { id: "expenses", icon: Receipt },
  { id: "balances", icon: Scale },
  { id: "members", icon: Users },
];

/** Everything a trip tab needs, derived once per render from the live data. */
export type TripView = {
  trip: Trip;
  expenses: Expense[];
  people: ReturnType<typeof people>;
  /** MEM-6: member ids as every list shows them, me first, then join order. */
  listed: string[];
  myMemberId: string;
  isOwner: boolean;
  /** False until the expenses listener has delivered (e.g. deleting the trip waits for it). */
  expensesLoaded: boolean;
};

export function TripScreen({ tripId, tab: tabParam }: { tripId: string; tab?: string }) {
  const me = useMe();
  const trip = useTrip(tripId);
  const expenses = useExpenses(tripId);
  usePaintedMark("painted:trip", trip.status === "ready" && expenses.status === "ready");
  const [, navigate] = useLocation();
  const tab: Tab = TABS.some((x) => x.id === tabParam) ? (tabParam as Tab) : "expenses";
  const [sheet, setSheet] = useState<"invite" | "menu" | null>(null);
  const [focusGuest, setFocusGuest] = useState(0);
  const [wasReady, setWasReady] = useState(false);
  if (trip.status === "ready" && !wasReady) setWasReady(true);
  /** Set before my own leave/delete, so losing access then isn't announced as a surprise. */
  const leaving = useRef(false);

  const view = useMemo<TripView | null>(() => {
    if (trip.status !== "ready") return null;
    const myMemberId = trip.data.memberIdsByUid[me.uid] ?? "";
    return {
      trip: trip.data,
      expenses: expenses.status === "ready" ? expenses.data : [],
      people: people(trip.data, me.uid),
      listed: listOrder(
        trip.data.members.map((m) => m.id),
        myMemberId,
      ),
      myMemberId,
      isOwner: trip.data.ownerUid === me.uid,
      expensesLoaded: expenses.status === "ready",
    };
  }, [trip, expenses, me.uid]);

  // TRIP-7, MEM-9: access lost while viewing → back to Home with a short notice.
  useEffect(() => {
    if (trip.status === "gone" && wasReady) {
      if (!leaving.current) showToast(t("trip.gone"));
      void goHome(navigate);
    }
  }, [trip.status, wasReady, navigate]);

  if (trip.status === "gone") return wasReady ? null : <NotFound />;

  const goTab = (next: Tab) => void switchTab(navigate, `/trip/${tripId}/${next}`);

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col">
      <TopBar
        leading={
          <IconButton label={t("trip.back")} onClick={() => void goHome(navigate)}>
            <ChevronLeft />
          </IconButton>
        }
        title={view?.trip.name ?? ""}
        large={{ tile: view && <TripTile icon={view.trip.icon} /> }}
        actions={
          view && (
            <>
              {view.isOwner && (
                <Button size="sm" className="shrink-0" onClick={() => setSheet("invite")}>
                  <UserPlus aria-hidden />
                  {t("trip.invite")}
                </Button>
              )}
              <IconButton label={t("trip.options")} onClick={() => setSheet("menu")}>
                <Ellipsis />
              </IconButton>
            </>
          )
        }
      />

      <div
        id="tabpanel"
        role="tabpanel"
        aria-label={t(`trip.tab.${tab}`)}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2",
          tab === "expenses" ? "pb-28" : "pb-6",
        )}
      >
        {!view || expenses.status === "loading" ? (
          <SkeletonRows />
        ) : tab === "expenses" ? (
          <ExpensesTab view={view} />
        ) : tab === "balances" ? (
          <BalancesTab view={view} />
        ) : (
          <MembersTab view={view} onInvite={() => setSheet("invite")} focusGuest={focusGuest} />
        )}
      </div>

      <div className="relative shrink-0">
        {/* specs/design.md "Add expense button": only on Expenses, where the new expense shows. */}
        {tab === "expenses" && (
          <Button
            variant="primary"
            data-fab
            className="absolute right-4 bottom-[calc(100%+16px)] z-10 min-h-13 rounded-full pr-5 pl-4 shadow-float"
            onClick={() => void openExpenseForm(navigate, `/trip/${tripId}/expense/new`)}
            disabled={!view}
          >
            <Plus aria-hidden />
            {t("trip.addExpense")}
          </Button>
        )}
        <nav
          role="tablist"
          aria-label={t("trip.tabs")}
          className="grid grid-cols-3 border-t border-border bg-surface px-1 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))]"
        >
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="tabpanel"
              onClick={() => goTab(id)}
              className="group flex min-h-13 min-w-0 flex-col items-center justify-center gap-1 text-tag text-fg-muted aria-selected:text-fg"
            >
              <span
                className={cn(
                  "grid h-[30px] w-14 place-items-center rounded-full [&_svg]:size-6",
                  tab === id && "bg-accent text-accent-fg",
                )}
              >
                <Icon aria-hidden />
              </span>
              <span className="max-w-full truncate">{t(`trip.tab.${id}`)}</span>
            </button>
          ))}
        </nav>
      </div>

      {view && (
        <>
          {view.isOwner && (
            <InviteSheet open={sheet === "invite"} trip={view.trip} onClose={() => setSheet(null)} />
          )}
          <TripMenu
            open={sheet === "menu"}
            view={view}
            onClose={() => setSheet(null)}
            onAddGuest={() => {
              setSheet(null);
              goTab("members");
              setFocusGuest((n) => n + 1);
            }}
            onLeaving={() => (leaving.current = true)}
            onLeft={() => void goHome(navigate)}
          />
        </>
      )}
    </div>
  );
}
