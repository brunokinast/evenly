import type { ReactNode } from "react";
import { useOnline } from "@/app/online";
import { t } from "@/i18n";
import { cn } from "@/lib/cn";

type Props = {
  title: ReactNode;
  /** Leading button (back / close). Compact bars use the smaller title. */
  leading?: ReactNode;
  actions?: ReactNode;
};

/** Top bar with safe-area padding, plus the APP-6 offline banner under it. */
export function TopBar({ title, leading, actions }: Props) {
  const online = useOnline();
  return (
    <>
      <header
        className={cn(
          "flex min-h-15 shrink-0 items-center gap-1 pt-[max(8px,env(safe-area-inset-top))] pr-2 pb-1",
          leading ? "pl-1" : "pl-4",
        )}
      >
        {leading}
        <h1
          className={cn(
            "min-w-0 flex-1 truncate",
            leading ? "text-[18px] leading-6 font-bold" : "text-title",
          )}
        >
          {title}
        </h1>
        {actions}
      </header>
      {!online && (
        <p role="status" className="shrink-0 bg-surface-2 px-4 py-2 text-caption text-fg">
          {t("offline.banner")}
        </p>
      )}
    </>
  );
}
