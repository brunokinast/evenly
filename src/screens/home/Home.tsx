import { useState } from "react";
import { Luggage, Plus, Smartphone, Ticket } from "lucide-react";
import { dismissInstallCard, useInstall } from "@/app/install";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { showInstallCard } from "@/domain/install";
import { t } from "@/i18n";
import { InstallSheets, startInstall, type InstallSheet } from "./InstallSheets";
import { ProfileSheet } from "./ProfileSheet";

type Props = { uid: string; name: string };

export function Home({ uid, name }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [installSheet, setInstallSheet] = useState<InstallSheet>(null);
  const install = useInstall();
  const tripCount = 0; // Trips slice: from useMyTrips().

  const runInstall = () => {
    if (!install.method) return;
    setProfileOpen(false);
    setInstallSheet(startInstall(install.method));
  };

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col">
      <header className="flex min-h-15 items-center gap-1 pt-[max(14px,env(safe-area-inset-top))] pr-2 pb-2.5 pl-4">
        <h1 className="min-w-0 flex-1 truncate text-title">{t("home.title")}</h1>
        <button
          type="button"
          aria-label={t("home.profile")}
          onClick={() => setProfileOpen(true)}
          className="grid size-12 shrink-0 place-items-center rounded-full"
        >
          <Avatar id={uid} name={name} />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-text">
          <Luggage className="size-6" aria-hidden />
        </span>
        <p className="max-w-80 text-caption text-fg-muted">{t("home.empty")}</p>
        {install.method && showInstallCard(install.method, tripCount, install.dismissed) && (
          <section
            aria-label={t("install.cardTitle")}
            className="mt-2 flex w-full flex-col gap-3 rounded-card bg-surface p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
                <Smartphone className="size-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-row">{t("install.cardTitle")}</h2>
                <p className="text-caption text-fg-muted">{t("install.cardBody")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="flex-1" onClick={runInstall}>
                {t(`install.action.${install.method}`)}
              </Button>
              <Button variant="quiet" onClick={dismissInstallCard}>
                {t("common.notNow")}
              </Button>
            </div>
          </section>
        )}
      </main>

      <div className="flex gap-2.5 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="flex-1">
          <Ticket aria-hidden />
          <span className="truncate">{t("home.joinTrip")}</span>
        </Button>
        <Button variant="primary" className="flex-1">
          <Plus aria-hidden />
          <span className="truncate">{t("home.newTrip")}</span>
        </Button>
      </div>

      <ProfileSheet
        open={profileOpen}
        name={name}
        onClose={() => setProfileOpen(false)}
        onInstall={runInstall}
      />
      <InstallSheets open={installSheet} onClose={() => setInstallSheet(null)} />
    </div>
  );
}
