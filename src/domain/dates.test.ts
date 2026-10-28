import { describe, expect, it } from "vitest";
import { dayKey, daysAgo, fromKeys, groupByDay, timeKey } from "./dates";

const at = (day: string, time: string) => fromKeys(day, time);

describe("dates", () => {
  it("round-trips local date and time keys", () => {
    const ms = at("2026-10-27", "20:15");
    expect(dayKey(ms)).toBe("2026-10-27");
    expect(timeKey(ms)).toBe("20:15");
  });

  it("counts days ago for Today / Yesterday labels", () => {
    const now = at("2026-10-27", "08:00");
    expect(daysAgo("2026-10-27", now)).toBe(0);
    expect(daysAgo("2026-10-26", now)).toBe(1);
    expect(daysAgo("2026-10-01", now)).toBe(26);
  });

  it("EXP-14 groups by day, newest first within and across groups", () => {
    const items = [
      { id: "a", spentAt: at("2026-10-26", "09:00"), createdAt: 1 },
      { id: "b", spentAt: at("2026-10-27", "08:00"), createdAt: 2 },
      { id: "c", spentAt: at("2026-10-27", "21:00"), createdAt: 3 },
      { id: "d", spentAt: at("2026-10-26", "22:00"), createdAt: 4 },
    ];
    const groups = groupByDay(items);
    expect(groups.map((g) => [g.day, g.items.map((i) => i.id)])).toEqual([
      ["2026-10-27", ["c", "b"]],
      ["2026-10-26", ["d", "a"]],
    ]);
  });
});
