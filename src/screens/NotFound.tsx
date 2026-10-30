import { Link } from "wouter";
import { MapPinOff } from "lucide-react";
import { buttonClass } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { t } from "@/i18n";

/** TRIP-9: a trip that doesn't exist or that the user can't access. */
export function NotFound() {
  return (
    <Notice icon={MapPinOff} title={t("trip.notFound")} body={t("trip.notFoundBody")}>
      <Link href="/" replace className={buttonClass("primary", "md", "mt-2")}>
        {t("trip.backHome")}
      </Link>
    </Notice>
  );
}
