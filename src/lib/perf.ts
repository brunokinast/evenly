import { useEffect, useRef } from "react";

// Timing marks for the performance work (docs/performance.md). `performance.mark` costs microseconds and
// nothing reads the marks unless the perf harness (scripts/perf.mjs) or the ?perf panel does.

/** Records `evenly:<name>` at this moment; `detail` shows next to it in the readers. */
export function mark(name: string, detail?: string | number) {
  performance.mark(`evenly:${name}`, { detail });
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

/** The ?perf panel (src/app/PerfPanel.tsx): `?perf` turns it on for this browser, `?perf=off` turns it off. */
export function wantsPerfPanel(): boolean {
  const flag = new URLSearchParams(location.search).get("perf");
  try {
    if (flag === "off") localStorage.removeItem("evenly.perf");
    else if (flag !== null) localStorage.setItem("evenly.perf", "1");
    return localStorage.getItem("evenly.perf") === "1";
  } catch {
    return flag !== null && flag !== "off";
  }
}

/** Where a snapshot came from: the phone's offline cache or the server ("empty" when there's no document). */
export function source(metadata: { fromCache: boolean } | undefined) {
  return metadata ? (metadata.fromCache ? "cache" : "server") : "empty";
}
