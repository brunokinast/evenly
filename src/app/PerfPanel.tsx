import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// Diagnostic panel for the performance work (docs/performance.md), not a user feature: open the site once
// with ?perf (?perf=off hides it again) and every launch shows the app's timing marks since the page started,
// so real numbers can be read on a real phone against the real project. English only, on purpose.

type Row = { name: string; at: number; detail?: unknown };

function rows(): Row[] {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const marks = performance
    .getEntriesByType("mark")
    .filter((m) => m.name.startsWith("evenly:"))
    .map((m) => ({ name: m.name.slice(7), at: m.startTime, detail: (m as PerformanceMark).detail }));
  return nav ? [{ name: "html received", at: nav.responseEnd }, ...marks] : marks;
}

function PerfPanel() {
  const [list, setList] = useState(rows);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setList(rows()), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-auto fixed top-[env(safe-area-inset-top)] right-2 z-50 max-h-[50vh] w-56 overflow-auto rounded-ctl border border-border bg-surface/95 p-2 text-caption text-fg shadow-lg">
      <button type="button" className="w-full text-left text-fg-muted" onClick={() => setOpen(!open)}>
        perf ({list.length}) {open ? "▾" : "▸"}
      </button>
      {open && (
        <table className="w-full tabular-nums">
          <tbody>
            {list.map((r, i) => (
              <tr key={i}>
                <td className="pr-1">
                  {r.name}
                  {r.detail !== undefined && r.detail !== null && (
                    <span className="text-fg-muted"> {String(r.detail)}</span>
                  )}
                </td>
                <td className="text-right">{Math.round(r.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function mountPerfPanel() {
  const host = document.createElement("div");
  document.body.append(host);
  createRoot(host).render(<PerfPanel />);
}
