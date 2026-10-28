import type { ReactNode } from "react";
import { useOnline } from "@/app/online";
import { t } from "@/i18n";
import { cn } from "@/lib/cn";

type Props = {
  title: ReactNode;
  /** Leading button (back / close). Without `large`, bars with one use the compact title. */
  leading?: ReactNode;
  actions?: ReactNode;
  /** Trip: buttons on a first row, the title large on its own row with this tile before it. */
  large?: { tile: ReactNode };
};

/** Top bar with safe-area padding (specs/design.md "Top bar"), plus the APP-6 offline banner under it. */
export function TopBar({ title, leading, actions, large }: Props) {
  const online = useOnline();
  const top = "pt-[max(8px,env(safe-area-inset-top))]";
  return (
    <>
      {large ? (
        <header className={cn("flex shrink-0 flex-col pb-3", top)}>
          <div className="flex min-h-12 items-center gap-1 pr-2 pl-1">
            {leading}
            <span className="flex-1" />
            {actions}
          </div>
          <div className="flex items-center gap-3 px-4 pt-1">
            {large.tile}
            <h1 className="line-clamp-2 min-w-0 flex-1 text-title break-words">{title}</h1>
          </div>
        </header>
      ) : (
        <header
          className={cn(
            "flex min-h-15 shrink-0 items-center gap-1 pr-2 pb-1",
            top,
            leading ? "pl-1" : "pl-4",
          )}
        >
          {leading}
          <h1 className={cn("min-w-0 flex-1 truncate", leading ? "text-heading" : "text-title")}>{title}</h1>
          {actions}
        </header>
      )}
      {!online && (
        <p role="status" className="shrink-0 bg-surface-2 px-4 py-2 text-caption text-fg">
          {t("offline.banner")}
        </p>
      )}
    </>
  );
}
