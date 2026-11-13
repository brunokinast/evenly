import type { IntakeEvent } from "@/domain/intake";
import { readStored, writeStored } from "@/lib/storage";
import type { CalendarSource } from "./calendarInbox";

/**
 * Dev server only (dropped from production builds): a stand-in for the phone's "Evenly" calendar, kept in
 * localStorage under `evenly.devCalendar` as `{ access, events }`, so e2e tests can show the Gemini review.
 */
const KEY = "evenly.devCalendar";
type Stored = { access: "granted" | "denied" | "prompt"; events: IntakeEvent[] };

const load = (): Stored => {
  try {
    return (JSON.parse(readStored(KEY) ?? "null") as Stored | null) ?? { access: "prompt", events: [] };
  } catch {
    return { access: "prompt", events: [] };
  }
};
const save = (s: Stored) => writeStored(KEY, JSON.stringify(s));

export const devCalendar: CalendarSource = {
  check: async () => ({ access: load().access, found: true }),
  requestAccess: async () => {
    save({ ...load(), access: "granted" });
    return { access: "granted", found: true };
  },
  read: async () => ({ found: true, events: load().events }),
  remove: async ({ ids }) => {
    const s = load();
    save({ ...s, events: s.events.filter((e) => !ids.includes(e.id)) });
  },
  addListener: async () => ({ remove: async () => {} }),
};
