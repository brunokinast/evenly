// Local-time helpers. Times are stored as ms since epoch (UTC) and shown in the device's time zone.

/** "YYYY-MM-DD" of a time, in local time. Used to group expenses by day (EXP-14). */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "HH:MM" of a time, in local time (for the time input). */
export function timeKey(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local date ("YYYY-MM-DD") + time ("HH:MM") → ms. */
export function fromKeys(day: string, time: string): number {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y!, m! - 1, d!, h!, min!).getTime();
}

/** Days between a day key and today (0 = today, 1 = yesterday). */
export function daysAgo(day: string, now: number): number {
  const [y, m, d] = day.split("-").map(Number);
  const then = new Date(y!, m! - 1, d!);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** EXP-14: newest first by date and time, grouped by local day (groups also newest first). */
export function groupByDay<T extends { spentAt: number; createdAt: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => b.spentAt - a.spentAt || b.createdAt - a.createdAt);
  const groups: { day: string; items: T[] }[] = [];
  for (const item of sorted) {
    const day = dayKey(item.spentAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

const pad = (n: number) => String(n).padStart(2, "0");
