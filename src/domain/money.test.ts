import { describe, expect, it } from "vitest";
import { digitsToCents, formatMoney, formatPlain } from "./money";

const nbsp = (s: string) => s.replace(/\s/g, " ");

describe("money", () => {
  it("EXP-2 fills cents from the right", () => {
    expect(digitsToCents("1234")).toBe(1234);
    expect(digitsToCents("0005")).toBe(5);
    expect(digitsToCents("12,34")).toBe(1234);
    expect(digitsToCents("")).toBe(0);
    expect(digitsToCents("123456789012")).toBe(1234567890);
  });

  it("EXP-2 formats in the user's language with the trip currency symbol", () => {
    expect(nbsp(formatMoney(123456, "BRL", "pt-BR"))).toBe("R$ 1.234,56");
    expect(formatMoney(123456, "USD", "en")).toBe("$1,234.56");
    expect(formatMoney(123456, "EUR", "en")).toBe("€1,234.56");
    expect(nbsp(formatMoney(123456, "EUR", "pt-BR"))).toBe("€ 1.234,56");
    expect(formatMoney(5, "GBP", "en")).toBe("£0.05");
    expect(formatPlain(123456, "pt-BR")).toBe("1.234,56");
  });
});
