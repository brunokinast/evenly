import { describe, expect, it } from "vitest";
import { familiesFor, fetchPlan, fontFor, graphemes, splitRuns, type Coverage } from "./runs";

const covers = (re: RegExp): Coverage => ({ has: (cp) => re.test(String.fromCodePoint(cp)) });
const latin: Coverage = {
  has: (cp) =>
    /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Common}\p{Script=Inherited}]/u.test(
      String.fromCodePoint(cp),
    ) && !/\p{Extended_Pictographic}/u.test(String.fromCodePoint(cp)),
};
const japanese = covers(/[\p{Script=Hiragana}\p{Script=Han} ]/u); // fetched fonts include the space

describe("PDF-6 fonts per character", () => {
  it("PDF-6 keeps emoji sequences and accents as one character", () => {
    expect(graphemes("👨‍👩‍👧🏖️ọ")).toEqual(["👨‍👩‍👧", "🏖️", "ọ"]);
  });

  it("PDF-6 a character goes to the first font that has it", () => {
    expect(fontFor("Д", [latin, japanese])).toBe(0);
    expect(fontFor("東", [latin, japanese])).toBe(1);
    expect(fontFor("🏖️", [latin, japanese])).toBe(-1);
  });

  it("PDF-6 a space goes to the bundled font when the current font has none", () => {
    const emojiOnly: Coverage = { has: (cp) => cp === 0x1f5fc };
    expect(splitRuns("🗼 Trip", [latin, emojiOnly])).toEqual([
      { text: "🗼", font: 1 },
      { text: " Trip", font: 0 },
    ]);
  });

  it("PDF-6 splits text into runs per font; spaces stay in the current run", () => {
    expect(splitRuns("Ana さくら 東京!", [latin, japanese])).toEqual([
      { text: "Ana ", font: 0 },
      { text: "さくら 東京", font: 1 },
      { text: "!", font: 0 },
    ]);
  });

  it("PDF-6 asks only the families the missing characters need", () => {
    expect(familiesFor("محمد", false)).toEqual(["Noto Sans Arabic"]);
    expect(familiesFor("東", true)[0]).toBe("Noto Sans JP");
    expect(familiesFor("東", false)[0]).toBe("Noto Sans SC");
    expect(familiesFor("🎄", false)[0]).toBe("Noto Emoji");
    expect(fetchPlan(["서", "울", "🎄"], false)).toEqual([
      ["Noto Sans KR", ["서", "울"]],
      ["Noto Emoji", ["🎄"]],
      ["Noto Sans Symbols 2", ["🎄"]],
      ["Noto Sans Symbols", ["🎄"]],
      ["Noto Sans Math", ["🎄"]],
    ]);
  });
});
