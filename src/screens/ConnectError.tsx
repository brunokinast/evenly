import { WifiOff } from "lucide-react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { retrySignIn } from "@/data/session";
import { t } from "@/i18n";

/** ID-6: identity setup failed. */
export function ConnectError() {
  return (
    <Notice icon={WifiOff} title={t("connect.title")} body={t("connect.body")}>
      <Button variant="primary" className="mt-2" onClick={() => void retrySignIn()}>
        {t("common.tryAgain")}
      </Button>
    </Notice>
  );
}
