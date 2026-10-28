import { useSyncExternalStore } from "react";

// Toasts (specs/design.md): bottom, above bars, auto-hide after 3 s. One at a time; a new one replaces it.
type Toast = { id: number; text: string } | null;

let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(text: string) {
  current = { id: (current?.id ?? 0) + 1, text };
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 3000);
  emit();
}

export function useToast(): Toast {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
