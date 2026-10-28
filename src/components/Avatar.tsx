import { avatarColor, initials } from "@/domain/names";
import { cn } from "@/lib/cn";

type Props = { id: string; name: string; size?: "sm" | "md"; guest?: boolean; className?: string };

/** Initials on a stable per-person color; guests get a dashed outline. Decorative: label the parent. */
export function Avatar({ id, name, size = "md", guest, className }: Props) {
  const n = avatarColor(id);
  return (
    <span
      aria-hidden
      style={{ background: `var(--av${n}-bg)`, color: `var(--av${n}-fg)` }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold tracking-[0.02em]",
        size === "md" ? "size-10 text-caption" : "size-8 text-tag",
        guest && "outline-[1.5px] -outline-offset-[1.5px] outline-current outline-dashed",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
