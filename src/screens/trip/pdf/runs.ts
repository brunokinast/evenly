// PDF-6: which font draws each character. Pure: fonts are anything that can say whether it has a code point.

export type Coverage = { has(codePoint: number): boolean };

/** Joiners and variation selectors ride along with the character before them; a font needn't map them. */
const IGNORABLE = /\u200c|\u200d|\ufe0e|\ufe0f/u;
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** Google Fonts families (Noto) by script, for characters the bundled Noto Sans doesn't have. */
const BY_SCRIPT: [RegExp, string][] = [
  [/\p{Script=Arabic}/u, "Noto Sans Arabic"],
  [/\p{Script=Hebrew}/u, "Noto Sans Hebrew"],
  [/\p{Script=Thai}/u, "Noto Sans Thai"],
  [/\p{Script=Lao}/u, "Noto Sans Lao"],
  [/\p{Script=Khmer}/u, "Noto Sans Khmer"],
  [/\p{Script=Myanmar}/u, "Noto Sans Myanmar"],
  [/\p{Script=Georgian}/u, "Noto Sans Georgian"],
  [/\p{Script=Armenian}/u, "Noto Sans Armenian"],
  [/\p{Script=Ethiopic}/u, "Noto Sans Ethiopic"],
  [/\p{Script=Devanagari}/u, "Noto Sans Devanagari"],
  [/\p{Script=Bengali}/u, "Noto Sans Bengali"],
  [/\p{Script=Gurmukhi}/u, "Noto Sans Gurmukhi"],
  [/\p{Script=Gujarati}/u, "Noto Sans Gujarati"],
  [/\p{Script=Oriya}/u, "Noto Sans Oriya"],
  [/\p{Script=Tamil}/u, "Noto Sans Tamil"],
  [/\p{Script=Telugu}/u, "Noto Sans Telugu"],
  [/\p{Script=Kannada}/u, "Noto Sans Kannada"],
  [/\p{Script=Malayalam}/u, "Noto Sans Malayalam"],
  [/\p{Script=Sinhala}/u, "Noto Sans Sinhala"],
  [/\p{Script=Hangul}/u, "Noto Sans KR"],
];
const SYMBOLS = ["Noto Sans Symbols 2", "Noto Sans Symbols", "Noto Sans Math"];

export function graphemes(text: string): string[] {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((s) => s.segment);
}

const codePoints = (g: string) => [...g].filter((c) => !IGNORABLE.test(c)).map((c) => c.codePointAt(0)!);

/** The first font that has every code point of the grapheme, or -1. */
export function fontFor(g: string, fonts: Coverage[]): number {
  const cps = codePoints(g);
  return fonts.findIndex((f) => cps.every((cp) => f.has(cp)));
}

/** Families to try, in order, for a grapheme the bundled font lacks. `kana`: the text has Japanese kana. */
export function familiesFor(g: string, kana: boolean): string[] {
  if (EMOJI.test(g)) return ["Noto Emoji", ...SYMBOLS];
  if (/\p{Script=Han}/u.test(g))
    return kana
      ? ["Noto Sans JP", "Noto Sans SC", "Noto Sans TC"]
      : ["Noto Sans SC", "Noto Sans TC", "Noto Sans JP"];
  if (KANA.test(g)) return ["Noto Sans JP"];
  const hit = BY_SCRIPT.find(([re]) => re.test(g));
  return hit ? [hit[1]] : SYMBOLS;
}

/**
 * The fetch plan for graphemes no font has yet: each family once, in first-needed order, with the graphemes
 * it may be asked for (Google Fonts `text=` returns just those). Later families are fallbacks: ask them only
 * for what's still missing.
 */
export function fetchPlan(missing: string[], kana: boolean): [family: string, graphemes: string[]][] {
  const plan = new Map<string, Set<string>>();
  for (const g of missing) {
    for (const family of familiesFor(g, kana)) {
      if (!plan.has(family)) plan.set(family, new Set());
      plan.get(family)!.add(g);
    }
  }
  return [...plan].map(([family, gs]) => [family, [...gs]]);
}

export const hasKana = (text: string) => KANA.test(text);

export type Run = { text: string; font: number };

/** Splits text into runs of graphemes drawn by the same font; -1 = no font has it. */
export function splitRuns(text: string, fonts: Coverage[]): Run[] {
  const runs: Run[] = [];
  for (const g of graphemes(text)) {
    // A space stays in the current run when its font has one, so a name in one script is one run
    // (shaping, right-to-left order); otherwise it goes to the first font that has it.
    const current = runs.at(-1)?.font ?? -1;
    const font =
      /^\s$/u.test(g) && current >= 0 && fontFor(g, [fonts[current]!]) === 0 ? current : fontFor(g, fonts);
    const last = runs.at(-1);
    if (last && last.font === font) last.text += g;
    else runs.push({ text: g, font });
  }
  return runs;
}
