import { useSyncExternalStore } from "react";
import { changes } from "@/lib/changes";

// Toasts (specs/design.md): bottom, above bars, auto-hide after 3 s. One at a time; a new one replaces it.
type Toast = { id: number; text: string } | null;

let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const toastChanges = changes();

export function showToast(text: string) {
  current = { id: (current?.id ?? 0) + 1, text };
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    toastChanges.notify();
  }, 3000);
  toastChanges.notify();
}

export function useToast(): Toast {
  return useSyncExternalStore(toastChanges.subscribe, () => current);
}
