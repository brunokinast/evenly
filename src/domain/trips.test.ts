import { describe, expect, it } from "vitest";
import { byActivity, checkTripName, codeDigits, defaultCurrency, pdfFileName, randomCode } from "./trips";
import type { Trip } from "./types";

describe("trips", () => {
  it("TRIP-2 trip names are trimmed and required", () => {
    expect(checkTripName(" Lisbon ")).toEqual({ ok: true, name: "Lisbon" });
    expect(checkTripName("   ")).toEqual({ ok: false, error: "empty" });
    expect(checkTripName("x".repeat(51))).toEqual({ ok: false, error: "tooLong" });
  });

  it("TRIP-3 default currency: PT-BR → BRL, else last used, else USD", () => {
    expect(defaultCurrency("pt-BR", "EUR")).toBe("BRL");
    expect(defaultCurrency("en", "EUR")).toBe("EUR");
    expect(defaultCurrency("en", null)).toBe("USD");
    expect(defaultCurrency("en", "XYZ")).toBe("USD");
  });

  it("INV-3 keeps only the first 6 digits of typed or pasted text", () => {
    expect(codeDigits("Use invite code: 482 913!")).toBe("482913");
    expect(codeDigits("12a3")).toBe("123");
    expect(codeDigits("12345678")).toBe("123456");
  });

  it("INV-1 codes are exactly 6 digits", () => {
    expect(randomCode(() => 0)).toBe("000000");
    expect(randomCode(() => 0.999_999_9)).toBe("999999");
    expect(randomCode()).toMatch(/^\d{6}$/);
  });

  it("TRIP-12 most recently active first; a trip never active counts from its creation", () => {
    const t = (id: string, createdAt: number, activeAt?: number) =>
      ({ id, createdAt, ...(activeAt !== undefined && { activeAt }) }) as Trip;
    const sorted = [t("old", 1, 2), t("new", 5), t("busy", 3, 9)].sort(byActivity).map((x) => x.id);
    expect(sorted).toEqual(["busy", "new", "old"]);
  });

  it("PDF-3 file name: symbols removed, spaces as _, plus _summary.pdf", () => {
    expect(pdfFileName("Lisbon 2026!")).toBe("Lisbon_2026_summary.pdf");
    expect(pdfFileName("São Paulo — férias")).toBe("Sao_Paulo_ferias_summary.pdf");
    expect(pdfFileName("🎉")).toBe("trip_summary.pdf");
  });
});
