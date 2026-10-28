import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our design tokens (src/index.css), so tailwind-merge knows `text-amount` is a size and `text-fg-muted`
// a color. Without this it treats both as the same unknown "text-*" class and drops the size.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["amount", "title", "total", "row", "body", "caption", "tag"],
      color: [
        ...["bg", "surface", "surface-2", "border", "fg", "fg-muted", "accent", "accent-fg", "accent-soft"],
        ...["accent-text", "positive", "negative", "scrim"],
      ],
      radius: ["ctl", "card", "sheet"],
      shadow: ["float"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
