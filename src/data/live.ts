import { useCallback, useSyncExternalStore } from "react";

/** What a live hook returns. `gone` = the document doesn't exist or access was lost (TRIP-7, TRIP-9, MEM-9). */
export type Live<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "gone" };

type Entry = {
  value: Live<unknown>;
  listeners: Set<() => void>;
  stop: (() => void) | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

const LOADING: Live<never> = { status: "loading" };
const entries = new Map<string, Entry>();
/** Keep a listener this long after its last user leaves, so going back and forth doesn't re-listen. */
const IDLE_MS = 30_000;

/**
 * The one live-data pattern (docs/architecture.md): one shared listener per key, however many components
 * use it, reference-counted. `start` attaches the Firebase listener and returns its stop function.
 */
export function useLive<T>(
  key: string | null,
  start: (emit: (value: Live<T>) => void) => () => void,
): Live<T> {
  // `start` only matters when the key's listener is first created, so the subscription depends on the key alone.
  const sub = useCallback(
    (onChange: () => void) => (key ? subscribe(key, start as never, onChange) : () => {}),
    [key], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return useSyncExternalStore(sub, () => (key ? ((entries.get(key)?.value as Live<T>) ?? LOADING) : LOADING));
}

function subscribe(
  key: string,
  start: (emit: (v: Live<unknown>) => void) => () => void,
  onChange: () => void,
) {
  let entry = entries.get(key);
  if (!entry) {
    entry = { value: LOADING, listeners: new Set(), stop: null, idleTimer: null };
    entries.set(key, entry);
  }
  const e = entry;
  if (e.idleTimer) clearTimeout(e.idleTimer);
  e.idleTimer = null;
  e.listeners.add(onChange);
  if (!e.stop) {
    e.stop = start((value) => {
      e.value = value;
      e.listeners.forEach((l) => l());
      // Failed while nobody was looking: drop it now, so the next visit listens anew.
      if (value.status === "gone" && e.listeners.size === 0) {
        if (e.idleTimer) clearTimeout(e.idleTimer);
        e.stop?.();
        entries.delete(key);
      }
    });
  }
  return () => {
    e.listeners.delete(onChange);
    if (e.listeners.size > 0) return;
    // A failed listener (access lost) is dropped right away, so coming back (e.g. after rejoining) listens
    // anew; deferred so a re-subscribe in the same tick keeps it.
    e.idleTimer = setTimeout(
      () => {
        e.stop?.();
        entries.delete(key);
      },
      e.value.status === "gone" ? 0 : IDLE_MS,
    );
  };
}

/**
 * Keeps a key's listener running without a screen showing it (e.g. Home holding its top trips, so opening one
 * finds the data ready). Returns the release; after it the usual idle time applies.
 */
export function holdLive<T>(key: string, start: (emit: (value: Live<T>) => void) => () => void) {
  return subscribe(key, start as never, () => {});
}

/** Current value of a live key, if something is listening (used by writes that need the latest data). */
export function peekLive<T>(key: string): Live<T> | undefined {
  return entries.get(key)?.value as Live<T> | undefined;
}
