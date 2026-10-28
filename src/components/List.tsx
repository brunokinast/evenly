import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Rows grouped on one surface card with inset dividers (specs/design.md "List row"). */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Uppercase group header above a list ("Today", "Your payments"). */
export function GroupHeader({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 ml-1 text-tag text-fg-muted uppercase">{children}</h3>;
}

type RowProps = {
  leading?: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
  /** Title may wrap (sentences like "Ana pays you"). */
  wrap?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  className?: string;
  children?: ReactNode;
};

/** A full-width row; a button when it has onClick. Long text truncates (APP-8). */
export function Row({
  leading,
  title,
  caption,
  trailing,
  compact,
  wrap,
  onClick,
  className,
  children,
}: RowProps) {
  const content = (
    <>
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-row", wrap ? "break-words" : "truncate")}>{title}</span>
        {caption && <span className="truncate text-caption text-fg-muted">{caption}</span>}
      </span>
      {trailing}
      {children}
    </>
  );
  const cls = cn(
    "flex w-full items-center gap-3 px-3.5 text-left",
    compact ? "min-h-13 py-2" : "min-h-16 py-3",
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "active:bg-surface-2")}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

/** Small uppercase pill: "You", "Owner", "Guest". */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="ml-1.5 inline-block rounded-full bg-surface-2 px-[7px] align-[2px] text-[11px] leading-4 font-bold tracking-[0.05em] text-fg-muted uppercase">
      {children}
    </span>
  );
}

/** Centered message with an icon tile and optional action (specs/design.md "Empty states"). */
export function EmptyState({
  icon,
  text,
  children,
}: {
  icon: ReactNode;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-3 py-8 text-center">
      {icon}
      <p className="max-w-80 text-caption text-fg-muted">{text}</p>
      {children}
    </div>
  );
}

/** Skeleton rows in the real layout for first load (no full-screen spinner). */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <ListGroup>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex min-h-16 items-center gap-3 px-3.5 py-3" aria-hidden>
          <span className="size-10 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-2/5 animate-pulse rounded bg-surface-2" />
            <span className="h-3 w-1/4 animate-pulse rounded bg-surface-2" />
          </span>
        </div>
      ))}
    </ListGroup>
  );
}
