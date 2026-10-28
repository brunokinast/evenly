// PDF-6: text in any script. The bundled Noto Sans (Latin, Greek, Cyrillic, Vietnamese) draws most text and
// works offline; characters it lacks come from Google Fonts' Noto families, asked for only those characters
// (`text=`), so a font is a few kB. fontkit shapes each run (joined Arabic, Indic vowel signs, emoji
// sequences) and the glyphs are placed one by one, since pdf-lib's drawText ignores glyph positions. Every
// font is embedded with only the glyphs drawn.
import * as fontkit from "fontkit";
import {
  beginText,
  endText,
  PDFHexString,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingColor,
  setFontAndSize,
  setTextMatrix,
  showText,
  type PDFDocument,
  type PDFFont,
  type PDFName,
  type PDFPage,
} from "pdf-lib";
import decompress from "woff2-encoder/decompress";
import notoBold from "./fonts/noto-sans-700.woff2?url";
import notoRegular from "./fonts/noto-sans-400.woff2?url";
import { fetchPlan, graphemes, hasKana, splitRuns, type Coverage } from "./runs";

type Face = { pdf: PDFFont; kit: fontkit.Font };
/** Fallback chains, same order in both weights; a family without bold uses its regular in the bold chain. */
type Chains = { regular: Face[]; bold: Face[] };

export type Rgb = [number, number, number];
export type Style = { size: number; bold?: boolean; color: Rgb; spacing?: number };

export class PdfText {
  private keys = new Map<PDFPage, Map<PDFFont, PDFName>>();
  private constructor(private chains: Chains) {}

  /** Loads the bundled font, then whatever `texts` need beyond it. Failed downloads leave "?" (offline). */
  static async load(doc: PDFDocument, texts: string[]): Promise<PdfText> {
    doc.registerFontkit(kit as unknown as Parameters<PDFDocument["registerFontkit"]>[0]);
    const [regular, bold] = await Promise.all(
      [notoRegular, notoBold].map(async (url) => face(doc, await fetchBytes(url))),
    );
    const chains: Chains = { regular: [regular!], bold: [bold!] };
    const has = (f: Face): Coverage => ({ has: (cp) => f.kit.hasGlyphForCodePoint(cp) });
    const covered = (g: string) => splitRuns(g, chains.regular.map(has)).every((r) => r.font >= 0);
    const all = texts.join("\n");
    const missing = [...new Set(graphemes(all))].filter((g) => !/^\s$/u.test(g) && !covered(g));
    plan: for (const [family, gs] of fetchPlan(missing, hasKana(all))) {
      const ask = gs.filter((g) => !covered(g));
      // In chunks, so a long trip in Chinese never makes a URL too long.
      for (let i = 0; i < ask.length; i += CHUNK) {
        let got: Awaited<ReturnType<typeof googleFont>>;
        try {
          // With a space, so a run in this font keeps its own spacing between words.
          got = await googleFont(doc, family, ` ${ask.slice(i, i + CHUNK).join("")}`);
        } catch {
          break plan; // no network (or too slow): stop asking; the rest prints as "?"
        }
        if (!got) continue; // this family has none of them: the next one may
        chains.regular.push(got.regular);
        chains.bold.push(got.bold ?? got.regular);
      }
    }
    return new PdfText(chains);
  }

  private shaped(text: string, style: Style) {
    const chain = style.bold ? this.chains.bold : this.chains.regular;
    const runs = splitRuns(
      text,
      chain.map((f) => ({ has: (cp: number) => f.kit.hasGlyphForCodePoint(cp) })),
    ).map(({ text: t, font }) => {
      // Nothing has it (offline): a "?" per character, in the bundled font.
      const f = chain[Math.max(font, 0)]!;
      const drawn =
        font < 0
          ? graphemes(t)
              .map((g) => (/^\s$/u.test(g) ? g : "?"))
              .join("")
          : t;
      const run = f.kit.layout(drawn);
      const scale = style.size / f.kit.unitsPerEm;
      const glyphs = run.glyphs.map((_, i) => ({
        dx: run.positions[i]!.xOffset * scale,
        dy: run.positions[i]!.yOffset * scale,
        advance: run.positions[i]!.xAdvance * scale + (style.spacing ?? 0),
      }));
      return { face: f, text: drawn, glyphs };
    });
    return runs;
  }

  width(text: string, style: Style): number {
    return this.shaped(text, style).reduce((w, r) => w + r.glyphs.reduce((a, g) => a + g.advance, 0), 0);
  }

  /** Cuts text with "…" to fit `max` points. */
  fit(text: string, max: number, style: Style): string {
    if (this.width(text, style) <= max) return text;
    const gs = graphemes(text);
    while (gs.length > 1 && this.width(`${gs.join("")}…`, style) > max) gs.pop();
    return `${gs.join("").trimEnd()}…`;
  }

  /** Word-wraps text to lines of at most `max` points; a word longer than a line breaks between characters. */
  wrap(text: string, max: number, style: Style): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/(?<=\s)/u)) {
      if (this.width(line + word, style) <= max) {
        line += word;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      line = "";
      for (const g of graphemes(word)) {
        if (line && this.width(line + g, style) > max) {
          lines.push(line);
          line = "";
        }
        line += g;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    return lines;
  }

  /** Draws text with its left edge at x and its baseline at `baseline` (PDF coordinates, y up). */
  draw(page: PDFPage, text: string, x: number, baseline: number, style: Style) {
    const ops = [pushGraphicsState(), beginText(), setFillingColor(rgb(...style.color))];
    let pen = x;
    for (const run of this.shaped(text, style)) {
      // pdf-lib shapes the same text with the same font, so its codes (the glyphs' ids in the embedded
      // subset, recorded for widths and copy/search) line up with fontkit's positions one to one.
      const codes = run.face.pdf.encodeText(run.text).toString().slice(1, -1).match(/.{4}/g) ?? [];
      ops.push(setFontAndSize(this.key(page, run.face.pdf), style.size));
      run.glyphs.forEach((g, i) => {
        ops.push(
          setTextMatrix(1, 0, 0, 1, pen + g.dx, baseline + g.dy),
          showText(PDFHexString.of(codes[i]!)),
        );
        pen += g.advance;
      });
    }
    ops.push(endText(), popGraphicsState());
    page.pushOperators(...ops);
  }

  private key(page: PDFPage, font: PDFFont): PDFName {
    let fonts = this.keys.get(page);
    if (!fonts) this.keys.set(page, (fonts = new Map()));
    let key = fonts.get(font);
    if (!key) fonts.set(font, (key = page.node.newFontDictionary(font.name, font.ref)));
    return key;
  }
}

const CHUNK = 150; // characters per Google Fonts request
const TIMEOUT_MS = 8000; // per Google request: a connection that's up but stuck counts as offline (PDF-5)

async function fetchBytes(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * WOFF2 → TrueType: PDF viewers can't read WOFF2, and fontkit can only subset composite glyphs (ọ, й)
 * from TrueType.
 */
async function face(doc: PDFDocument, woff2: Uint8Array): Promise<Face> {
  const ttf = await decompress(woff2);
  return { pdf: await doc.embedFont(ttf, { subset: true }), kit: kit.create(ttf) };
}

/**
 * fontkit 2 for pdf-lib, which was written for fontkit 1: the same create(), layout and subset API, except
 * that a subset now encodes to bytes at once instead of to a stream.
 */
const kit = {
  create(bytes: Uint8Array): fontkit.Font {
    const font = fontkit.create(bytes as Buffer) as fontkit.Font;
    const createSubset = font.createSubset.bind(font);
    return Object.assign(font, {
      createSubset: () => {
        const subset = createSubset();
        const encodeStream = () => {
          const on: Record<string, (data?: Uint8Array) => void> = {};
          const stream = {
            on(event: string, fn: (data?: Uint8Array) => void) {
              if (Object.keys(on).length === 0) {
                queueMicrotask(() => {
                  try {
                    on.data?.(subset.encode());
                    on.end?.();
                  } catch (e) {
                    on.error?.(e as never);
                  }
                });
              }
              on[event] = fn;
              return stream;
            },
          };
          return stream;
        };
        return Object.assign(subset, { encodeStream });
      },
    });
  },
};

/**
 * One Google Fonts family cut to `text`, regular and (if the family has it) bold. One request per weight:
 * asking for both at once returns the variable font, whose default (often Thin) is all a PDF can show.
 */
async function googleFont(doc: PDFDocument, family: string, text: string) {
  const url = async (weight: string) => {
    const res = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}${weight}&text=${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    return res.ok ? /src:\s*url\(([^)]+)\)/.exec(await res.text())?.[1] : undefined;
  };
  const [regularUrl, boldUrl] = await Promise.all([
    url(":wght@400").then((u) => u ?? url("")), // families without a weight axis only take the plain form
    url(":wght@700"),
  ]);
  if (!regularUrl) return null;
  const [regular, bold] = await Promise.all([
    face(doc, await fetchBytes(regularUrl, AbortSignal.timeout(TIMEOUT_MS))),
    boldUrl ? face(doc, await fetchBytes(boldUrl, AbortSignal.timeout(TIMEOUT_MS))) : null,
  ]);
  return { regular, bold };
}
