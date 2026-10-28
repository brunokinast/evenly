import { cn } from "@/lib/cn";

/** The Evenly logo in the theme's text color: public/logo.svg used as a mask over --fg (design.md "Brand"). */
export function Logo({ className, label }: { className: string; label?: string }) {
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn("block bg-fg [mask:url(/logo.svg)_center/contain_no-repeat]", className)}
    />
  );
}
