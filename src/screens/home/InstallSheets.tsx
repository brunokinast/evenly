import { Download, Share, SquarePlus, Check, type LucideIcon } from "lucide-react";
import { promptInstall, useInstall } from "@/app/install";
import { Sheet } from "@/components/Sheet";
import { t, type MessageKey } from "@/i18n";

export type InstallSheet = "ios" | "apk" | null;

/** APP-3: runs this device's install action; returns which sheet to open, if any. */
export function startInstall(method: "apk" | "ios" | "prompt"): InstallSheet {
  if (method === "prompt") {
    void promptInstall();
    return null;
  }
  return method;
}

const IOS_STEPS: [LucideIcon, MessageKey][] = [
  [Share, "install.ios.step1"],
  [SquarePlus, "install.ios.step2"],
  [Check, "install.ios.step3"],
];

export function InstallSheets({ open, onClose }: { open: InstallSheet; onClose: () => void }) {
  const { apkUrl } = useInstall();
  return (
    <>
      <Sheet open={open === "ios"} onClose={onClose} title={t("install.ios.title")}>
        <ol className="flex flex-col gap-1">
          {IOS_STEPS.map(([Icon, key], i) => (
            <li key={key} className="flex min-h-14 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-caption font-bold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">{t(key)}</span>
              <Icon className="size-5 shrink-0 text-accent-text" aria-hidden />
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-ctl bg-accent text-row text-accent-fg active:brightness-95"
        >
          {t("common.done")}
        </button>
      </Sheet>
      <Sheet open={open === "apk"} onClose={onClose} title={t("install.apk.title")}>
        <p className="text-caption text-fg-muted">{t("install.apk.body")}</p>
        {apkUrl && (
          <a
            href={apkUrl}
            download
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-ctl bg-accent text-row text-accent-fg active:brightness-95"
          >
            <Download className="size-5" aria-hidden />
            {t("install.apk.download")}
          </a>
        )}
      </Sheet>
    </>
  );
}
