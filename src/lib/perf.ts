import { useEffect, useRef } from "react";
import { readStored, writeStored } from "./storage";

// Timing marks for the performance work (docs/performance.md). `performance.mark` costs microseconds and
// nothing reads the marks unless the perf harness (scripts/perf.mjs) or the ?perf panel does.

/** Records `evenly:<name>` at this moment; `detail` shows next to it in the readers. */
export function mark(name: string, detail?: string | number) {
  const entry = `evenly:${name}`;
  // Snapshot marks repeat for as long as the app is open: keep the latest 100 of each.
  if (performance.getEntriesByName(entry).length >= 100) performance.clearMarks(entry);
  performance.mark(entry, { detail });
}

/** Marks `name` once, after the first frame painted with `ready` true (e.g. a screen showing its data). */
export function usePaintedMark(name: string, ready: boolean) {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    requestAnimationFrame(() => setTimeout(() => mark(name)));
  }, [name, ready]);
}

const PERF_KEY = "evenly.perf";

/** The ?perf panel (src/app/PerfPanel.tsx): `?perf` turns it on for this browser, `?perf=off` turns it off. */
export function wantsPerfPanel(): boolean {
  const flag = new URLSearchParams(location.search).get("perf");
  if (flag !== null) writeStored(PERF_KEY, flag === "off" ? null : "1");
  return flag !== null ? flag !== "off" : readStored(PERF_KEY) === "1";
}

/** Where a snapshot came from: the phone's offline cache or the server ("empty" when there's no document). */
export function source(metadata: { fromCache: boolean } | undefined) {
  return metadata ? (metadata.fromCache ? "cache" : "server") : "empty";
}
