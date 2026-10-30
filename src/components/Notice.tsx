import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A whole screen that only explains something (a missing trip, no connection) and offers one action. */
export function Notice({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  /** The action, given `mt-2`. */
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex h-full max-w-app flex-col items-center justify-center gap-3 px-4 text-center">
      <Icon className="size-8 text-fg-muted" aria-hidden />
      <h1 className="text-title">{title}</h1>
      <p className="text-caption text-fg-muted">{body}</p>
      {children}
    </main>
  );
}
