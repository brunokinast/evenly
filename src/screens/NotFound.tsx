import { Link } from "wouter";
import { MapPinOff } from "lucide-react";
import { buttonClass } from "@/components/Button";
import { t } from "@/i18n";

/** TRIP-9: a trip that doesn't exist or that the user can't access. */
export function NotFound() {
  return (
    <main className="mx-auto flex h-full max-w-[520px] flex-col items-center justify-center gap-3 px-4 text-center">
      <MapPinOff className="size-8 text-fg-muted" aria-hidden />
      <h1 className="text-title">{t("trip.notFound")}</h1>
      <p className="text-caption text-fg-muted">{t("trip.notFoundBody")}</p>
      <Link href="/" replace className={buttonClass("primary", "md", "mt-2")}>
        {t("trip.backHome")}
      </Link>
    </main>
  );
}
