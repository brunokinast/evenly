import { useSyncExternalStore } from "react";
import { App } from "@capacitor/app";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { IntakeEvent } from "@/domain/intake";
import { changes } from "@/lib/changes";
import { devCalendar } from "./devCalendar";

/**
 * The "Evenly" calendar on this phone, where Gemini writes expenses (specs/features/assistant.md).
 * Device state, not server data: the Android app reads it through EvenlyCalendarPlugin.java.
 */
export type CalendarAccess = "granted" | "denied" | "prompt";
type Status = { access: CalendarAccess; found: boolean };

export type CalendarSource = {
  check(): Promise<Status>;
  requestAccess(): Promise<Status>;
  /** Reads the events; `sync` first asks the phone to sync the calendar (AST-3). */
  read(o: { sync: boolean }): Promise<{ found: boolean; events: IntakeEvent[] }>;
  remove(o: { ids: string[] }): Promise<void>;
  /** The calendar changed (e.g. a sync brought a new event). */
  addListener(event: "change", listener: () => void): Promise<PluginListenerHandle>;
};

const native = Capacitor.getPlatform() === "android";
// Android app only; the dev server gets a stand-in kept in localStorage, so e2e can show the review.
const source: CalendarSource | null = native
  ? registerPlugin<CalendarSource>("EvenlyCalendar")
  : import.meta.env.DEV
    ? devCalendar
    : null;

export type Inbox = {
  /** This device can read the calendar (the Android app). */
  available: boolean;
  /** null until first checked. */
  access: CalendarAccess | null;
  found: boolean;
  /** Not yet handled in the review. */
  events: IntakeEvent[];
  /** When they were read (ms): an event's time is never later than this (AST-4). */
  readAt: number;
  /** Counts app opens and returns (AST-3). */
  visit: number;
  /** "Later" was tapped during this visit (AST-10). */
  postponed: boolean;
};

let state: Inbox = {
  available: !!source,
  access: null,
  found: false,
  events: [],
  readAt: 0,
  visit: 0,
  postponed: false,
};
// Added or removed in the review: hidden at once, and kept hidden even if deleting the event fails, so an
// expense can't be added twice.
const handled = new Set<string>();
const store = changes();
const set = (patch: Partial<Inbox>) => {
  state = { ...state, ...patch };
  store.notify();
};

export const useCalendarInbox = () => useSyncExternalStore(store.subscribe, () => state);

/** Re-reads the calendar. `visit`: an app open or return, rather than a change while open. */
async function refresh(visit: boolean) {
  if (!source) return;
  try {
    const status = await source.check();
    // Sync only on a visit: syncing changes the calendar, which calls this again.
    const read =
      status.access === "granted" ? await source.read({ sync: visit }) : { found: status.found, events: [] };
    set({
      access: status.access,
      found: read.found,
      events: read.events.filter((e) => !handled.has(e.id)),
      readAt: Date.now(),
      ...(visit && { visit: state.visit + 1, postponed: false }),
    });
  } catch {
    // The calendar can't be read now; the next open tries again.
  }
}

let started = false;

/** AST-3: starts reading once Home's list shows (startup is never slower); again on every return. */
export function startInbox() {
  if (!source || started) return;
  started = true;
  void refresh(true);
  if (native) void App.addListener("resume", () => void refresh(true));
  let timer: ReturnType<typeof setTimeout> | undefined;
  void source.addListener("change", () => {
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(false), 300); // a sync changes many rows at once
  });
}

/** AST-1 step 3. */
export async function requestCalendarAccess() {
  if (!source) return;
  set(await source.requestAccess());
  await refresh(false);
}

/** AST-1: the setup guide re-checks whether the calendar exists. */
export const recheckInbox = () => refresh(false);

/** AST-10: "Later" closes the review until the next visit. */
export const postpone = () => set({ postponed: true });

/** AST-9, AST-10: added or removed in the review; the events leave the calendar. */
export async function handleEvents(ids: string[]) {
  if (!source || ids.length === 0) return;
  ids.forEach((id) => handled.add(id));
  set({ events: state.events.filter((e) => !handled.has(e.id)) });
  try {
    await source.remove({ ids });
  } catch {
    // Still hidden here; the events stay in the calendar.
  }
}
