import { useState } from "react";
import { useLocation } from "wouter";
import { openTrip } from "@/app/nav";
import { ChevronRight, Luggage, Plus, Smartphone, Ticket } from "lucide-react";
import { dismissInstallCard, useInstall } from "@/app/install";
import { useOnline } from "@/app/online";
import { Avatar } from "@/components/Avatar";
import { Button, ButtonRow } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { Logo } from "@/components/Logo";
import { EmptyState, IconTile, ListGroup, Row, SkeletonRows } from "@/components/List";
import { TopBar } from "@/components/TopBar";
import { TripTile } from "@/components/TripIcon";
import { useMe } from "@/data/session";
import { useMyTrips } from "@/data/trips";
import { showInstallCard } from "@/domain/install";
import { longDate, t } from "@/i18n";
import { InstallSheets, startInstall, type InstallSheet } from "./InstallSheets";
import { JoinSheet } from "./JoinSheet";
import { NewTripSheet } from "./NewTripSheet";
import { ProfileSheet } from "./ProfileSheet";

type SheetName = "profile" | "newTrip" | "join" | null;

export function Home() {
  const me = useMe();
  const trips = useMyTrips(me.uid);
  const online = useOnline();
  const install = useInstall();
  const [, navigate] = useLocation();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [installSheet, setInstallSheet] = useState<InstallSheet>(null);

  const runInstall = () => {
    if (!install.method) return;
    setSheet(null);
    setInstallSheet(startInstall(install.method));
  };
  const list = trips.status === "ready" ? trips.data : [];

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col">
      <TopBar
        title={
          <>
            {/* The logo is the visible title; "Your trips" names the screen for screen readers. */}
            <Logo className="h-8 w-[115px]" />
            <span className="sr-only">{t("home.title")}</span>
          </>
        }
        actions={
          <IconButton label={t("home.profile")} onClick={() => setSheet("profile")}>
            <Avatar id={me.uid} name={me.name} />
          </IconButton>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-1 pb-6">
        {trips.status === "loading" ? (
          <SkeletonRows />
        ) : list.length > 0 ? (
          <ListGroup>
            {list.map((trip) => (
              <Row
                key={trip.id}
                leading={<TripTile icon={trip.icon} />}
                title={trip.name}
                caption={`${trip.currency} · ${longDate(trip.createdAt)}`}
                trailing={<ChevronRight className="size-5 shrink-0 text-fg-muted" aria-hidden />}
                onClick={() => void openTrip(navigate, `/trip/${trip.id}`)}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyState
            icon={
              <IconTile>
                <Luggage />
              </IconTile>
            }
            text={t("home.empty")}
          >
            {install.method && showInstallCard(install.method, list.length, install.dismissed) && (
              <section
                aria-label={t("install.cardTitle")}
                className="mt-2 flex w-full flex-col gap-3 rounded-card bg-surface p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <IconTile>
                    <Smartphone />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-row">{t("install.cardTitle")}</h2>
                    <p className="text-caption text-fg-muted">{t("install.cardBody")}</p>
                  </div>
                </div>
                <ButtonRow>
                  <Button variant="secondary" onClick={runInstall}>
                    {t(`install.action.${install.method}`)}
                  </Button>
                  <Button variant="quiet" onClick={dismissInstallCard}>
                    {t("common.notNow")}
                  </Button>
                </ButtonRow>
              </section>
            )}
          </EmptyState>
        )}
      </main>

      <ButtonRow className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button variant="secondary" disabled={!online} onClick={() => setSheet("join")}>
          <Ticket aria-hidden />
          {t("home.joinTrip")}
        </Button>
        <Button variant="primary" disabled={!online} onClick={() => setSheet("newTrip")}>
          <Plus aria-hidden />
          {t("home.newTrip")}
        </Button>
      </ButtonRow>

      <ProfileSheet
        open={sheet === "profile"}
        name={me.name}
        onClose={() => setSheet(null)}
        onInstall={runInstall}
      />
      <NewTripSheet open={sheet === "newTrip"} onClose={() => setSheet(null)} />
      <JoinSheet open={sheet === "join"} onClose={() => setSheet(null)} myTrips={list} />
      <InstallSheets open={installSheet} onClose={() => setInstallSheet(null)} />
    </div>
  );
}
