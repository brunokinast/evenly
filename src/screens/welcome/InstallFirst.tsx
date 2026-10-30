import { skipInstallFirst, useInstall } from "@/app/install";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { t } from "@/i18n";
import { ApkDownload, IosSteps } from "../install/InstallSheets";

/** ID-10 (specs/design.md "Install first"): before the name, where the installed app is a separate identity. */
export function InstallFirst({ method }: { method: "apk" | "ios" }) {
  const { apkUrl } = useInstall();
  return (
    <main className="mx-auto flex h-full max-w-app flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Logo label="Evenly" className="mb-9 h-14 w-[202px]" />
        <h1 className="mb-3 text-title text-balance">{t(`installFirst.${method}.title`)}</h1>
        <p className="mb-6 text-caption text-balance text-fg-muted">{t(`installFirst.${method}.body`)}</p>
        {method === "ios" ? (
          <div className="mb-4 w-full rounded-card bg-surface px-4 py-2 text-left">
            <IosSteps />
          </div>
        ) : (
          <div className="mb-4 flex w-full flex-col gap-3">
            <p className="text-caption text-balance text-fg-muted">{t("install.apk.body")}</p>
            {apkUrl && <ApkDownload url={apkUrl} />}
          </div>
        )}
        <Button variant="quiet" onClick={skipInstallFirst}>
          {t(`installFirst.${method}.skip`)}
        </Button>
      </div>
    </main>
  );
}
