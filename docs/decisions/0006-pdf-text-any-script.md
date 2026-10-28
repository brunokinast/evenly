# 0006: PDF text in any script

Status: accepted (2026-10-28). Replaces jsPDF (Helvetica, Western European letters only).

## Decision

- **pdf-lib + fontkit 2** draw the PDF (`src/screens/trip/pdf/`). fontkit shapes each run (joined Arabic, Indic vowel signs, emoji sequences); the glyphs are placed one by one, since pdf-lib's `drawText` ignores glyph positions. pdf-lib was written for fontkit 1; a small adapter in `text.ts` bridges the subset API.
- **Bundled Noto Sans** regular and bold (Latin incl. Vietnamese, Greek, Cyrillic, punctuation, currency; ~90 kB WOFF2 each), so most trips need no network and export offline.
- **Other scripts and emoji from Google Fonts' Noto families at export time** (PDF-6), one request per family and weight, with `text=` set to only the characters still missing, so each font is a few kB. Only that character set reaches Google, never the text. A failed fetch leaves "?" for those characters.
- **WOFF2 → TrueType** with `woff2-encoder/decompress` (Google's decoder in WebAssembly): PDF viewers can't read WOFF2, and fontkit can't subset composite glyphs (ọ, й) from WOFF2. Every font is then subset to the glyphs drawn (PDFs of ~20–30 kB).
- One weight per Google request: asking for 400 and 700 together returns the variable font, whose default instance (often Thin) is all a PDF shows.

## Rejected

- One big embedded font: no single font covers CJK at a sane size.
- The system's Print → Save as PDF: perfect rendering and color emoji, but a print screen instead of the share sheet (PDF-4).

## Consequences

- The export chunk is ~490 kB gzipped (pdf-lib, fontkit, the decoder), loaded only on export (`ON_DEMAND`).
- Emoji print in black and white (Noto Emoji); color emoji can't be drawn as PDF text.
- Mixed left-to-right and right-to-left text in one string is drawn run by run in logical order (no full bidi reordering).
