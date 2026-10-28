import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a type role and a color together (the empty amount stays amount-sized)", () => {
    expect(cn("text-amount", "text-fg-muted")).toBe("text-amount text-fg-muted");
  });

  it("still lets a later class of the same kind win", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption");
    expect(cn("text-fg", "text-fg-muted")).toBe("text-fg-muted");
    expect(cn("rounded-ctl", "rounded-card")).toBe("rounded-card");
  });
});
