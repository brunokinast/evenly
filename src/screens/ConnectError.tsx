import { WifiOff } from "lucide-react";
import { Button } from "@/components/Button";
import { retrySignIn } from "@/data/session";
import { t } from "@/i18n";

/** ID-6: identity setup failed. */
export function ConnectError() {
  return (
    <main className="mx-auto flex h-full max-w-[520px] flex-col items-center justify-center gap-3 px-4 text-center">
      <WifiOff className="size-8 text-fg-muted" aria-hidden />
      <h1 className="text-title">{t("connect.title")}</h1>
      <p className="text-caption text-fg-muted">{t("connect.body")}</p>
      <Button variant="primary" className="mt-2" onClick={() => void retrySignIn()}>
        {t("common.tryAgain")}
      </Button>
    </main>
  );
}
