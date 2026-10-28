import { describe, expect, it } from "vitest";
import { avatarColor, checkName, initials } from "./names";

describe("checkName", () => {
  it("ID-3 trims the name", () => {
    expect(checkName("  Ana  ")).toEqual({ ok: true, name: "Ana" });
  });

  it("ID-3 needs at least 2 characters after trimming", () => {
    expect(checkName(" A ")).toEqual({ ok: false, error: "tooShort" });
    expect(checkName("   ")).toEqual({ ok: false, error: "tooShort" });
    expect(checkName("Al")).toEqual({ ok: true, name: "Al" });
  });

  it("ID-3 allows at most 50 characters", () => {
    expect(checkName("a".repeat(50)).ok).toBe(true);
    expect(checkName("a".repeat(51))).toEqual({ ok: false, error: "tooLong" });
  });

  it("ID-3 counts characters, not UTF-16 units", () => {
    expect(checkName("😀".repeat(50)).ok).toBe(true);
  });
});

describe("initials", () => {
  it("uses the first letter of the first two words", () => {
    expect(initials("ana beatriz souza")).toBe("AB");
    expect(initials("  Sam ")).toBe("S");
    expect(initials("Élise Ñúñez")).toBe("ÉÑ");
  });
});

describe("avatarColor", () => {
  it("is stable and within the 6 avatar colors", () => {
    expect(avatarColor("member-1")).toBe(avatarColor("member-1"));
    for (const id of ["a", "b", "xyz", "member-42", ""]) {
      expect(avatarColor(id)).toBeGreaterThanOrEqual(1);
      expect(avatarColor(id)).toBeLessThanOrEqual(6);
    }
  });
});
