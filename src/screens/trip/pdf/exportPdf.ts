// PDF-1..6, specs/design.md "PDF". Loaded on demand (listed in scripts/check-bundle-size.mjs ON_DEMAND),
// so pdf-lib and the fonts aren't startup code.
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import { shareFile } from "@/app/share";
import { settle, totalSpent } from "@/domain/balances";
import { splitsAll } from "@/domain/split";
import { pdfFileName } from "@/domain/trips";
import { longDate, money, shortDate, t, tn } from "@/i18n";
import { who } from "../labels";
import type { TripView } from "../TripScreen";
import { PdfText, type Rgb, type Style } from "./text";

const W = 595.28; // A4 in pt
const H = 841.89;
const M = 40;
const ROW = 22;
// The light theme's token values (specs/design.md "Color"); a PDF can't read CSS variables.
const C: Record<
  "fg" | "muted" | "border" | "surface2" | "accent" | "accentFg" | "positive" | "negative",
  Rgb
> = {
  fg: [0x17, 0x1a, 0x21],
  muted: [0x5d, 0x64, 0x72],
  border: [0xdd, 0xe1, 0xe8],
  surface2: [0xee, 0xf0, 0xf4],
  accent: [0xf2, 0xb2, 0x33],
  accentFg: [0x1a, 0x14, 0x05],
  positive: [0x18, 0x79, 0x4e],
  negative: [0xc3, 0x3b, 0x2c],
};

type TextOpts = {
  size?: number;
  bold?: boolean;
  color?: Rgb;
  right?: boolean;
  max?: number;
  caps?: boolean;
};

export async function exportTripPdf(view: TripView) {
  const { trip, expenses } = view;
  const cur = trip.currency;
  const doc = await PDFDocument.create();
  // Real names, not "You": the PDF is shared with others.
  const name = (id: string) => who(view, id).name;
  const ids = new Set([...trip.members.map((m) => m.id), ...expenses.map((e) => e.payerId)]);
  const fonts = await PdfText.load(doc, [
    trip.name,
    ...[...ids].map(name),
    ...expenses.map((e) => e.description),
  ]);
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  const newPage = () => {
    page = doc.addPage([W, H]);
    pages.push(page);
  };
  newPage();
  let y = M; // from the top, like the layout below; PDF coordinates go up from the bottom

  const style = (o: TextOpts): Style => ({
    size: o.size ?? 10,
    bold: o.bold,
    color: unit(o.color ?? C.fg),
    spacing: o.caps ? 0.5 : 0,
  });
  const width = (s: string, o: TextOpts = {}) => fonts.width(s, style(o));
  const text = (s: string, x: number, o: TextOpts = {}) => {
    const st = style(o);
    let str = o.caps ? s.toLocaleUpperCase() : s;
    if (o.max) str = fonts.fit(str, o.max, st);
    // Letter spacing adds after the last letter too; right-aligned caps leave it out.
    const w = fonts.width(str, st) - (st.spacing ?? 0);
    fonts.draw(page, str, o.right ? x - w : x, H - y, st);
  };
  const rule = (at: number) =>
    page.drawLine({
      start: { x: M, y: H - at },
      end: { x: W - M, y: H - at },
      thickness: 0.6,
      color: rgb(...unit(C.border)),
    });
  /** Starts a new page when `h` more points don't fit; `again` redraws a table header there. */
  const ensure = (h: number, again?: () => void) => {
    if (y + h <= H - M - 24) return;
    newPage();
    y = M;
    again?.();
  };
  const section = (title: string) => {
    ensure(ROW * 5); // title, table header and at least one row stay together
    y += 30;
    text(title, M, { size: 9, bold: true, color: C.muted, caps: true });
    y += 8;
  };
  /** A table header row of muted caps labels: [text, x, right-aligned]. */
  const header = (cols: [string, number, boolean?][]) => {
    y += 14;
    for (const [s, x, right] of cols) text(s, x, { size: 8, bold: true, color: C.muted, caps: true, right });
    y += 6;
    rule(y);
  };

  // Header: the Evenly logo, "Trip summary", the trip name and its facts.
  const logo = await loadLogo();
  if (logo) {
    const img = await doc.embedPng(logo);
    page.drawImage(img, {
      x: M,
      y: H - y - LOGO_H,
      width: (LOGO_H * 432) / 120,
      height: LOGO_H,
    });
  }
  y += LOGO_H / 2 + 4;
  if (!logo) text("Evenly", M, { size: 14, bold: true });
  text(t("pdf.summary"), W - M, { size: 10, color: C.muted, right: true });
  y += 42;
  for (const l of fonts.wrap(trip.name, W - 2 * M, style({ size: 22, bold: true }))) {
    text(l, M, { size: 22, bold: true });
    y += 26;
  }
  y -= 8;
  text(
    [
      t("pdf.created", { date: longDate(trip.createdAt) }),
      cur,
      tn("members.count", trip.members.length),
      tn("expenses.count", expenses.length),
    ].join("  ·  "),
    M,
    { color: C.muted },
  );

  // Summary tiles.
  const total = totalSpent(expenses);
  const tiles: [string, string][] = [
    [t("expenses.total"), money(total, cur)],
    [t("balances.perPerson"), money(Math.round(total / trip.members.length), cur)],
    [t("pdf.expenses"), String(expenses.length)],
  ];
  y += 20;
  const tileW = (W - 2 * M - 2 * 10) / 3;
  tiles.forEach(([k, v], i) => {
    const x = M + i * (tileW + 10);
    page.drawSvgPath(roundedRect(tileW, 54, 8), {
      x,
      y: H - y,
      color: rgb(...unit(C.surface2)),
    });
    const top = y;
    y = top + 20;
    text(k, x + 12, { size: 9, color: C.muted, max: tileW - 24 });
    y = top + 41;
    text(v, x + 12, { size: 15, bold: true, max: tileW - 24 });
    y = top;
  });
  y += 54;

  // Suggested payments, in the MEM-6 order (BAL-8).
  const { bal, pays, rows } = settle(
    trip.members.map((m) => m.id),
    expenses,
    view.listed,
  );
  section(t("pdf.settlements"));
  if (pays.length === 0) {
    y += 16;
    text(t("balances.allSettled"), M, { color: C.muted });
  }
  for (const p of pays) {
    ensure(ROW);
    const from = name(p.from);
    const to = name(p.to);
    y += ROW - 7;
    text(from, M, { max: 190 });
    const fromW = Math.min(width(from), 190);
    arrow(page, M + fromW + 8, H - (y - 3.5));
    text(to, M + fromW + 30, { max: 190 });
    text(money(p.cents, cur), W - M, { bold: true, right: true });
    y += 7;
    rule(y);
  }

  // People: paid, share and balance, in the MEM-6 order; former members after them.
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const e of expenses) {
    paid.set(e.payerId, (paid.get(e.payerId) ?? 0) + e.amountCents);
    for (const [id, c] of Object.entries(e.shares)) share.set(id, (share.get(id) ?? 0) + c);
  }
  const PAID = M + 290;
  const SHARE = M + 380;
  const peopleHeader = () =>
    header([
      [t("pdf.person"), M],
      [t("pdf.paid"), PAID, true],
      [t("pdf.share"), SHARE, true],
      [t("pdf.balance"), W - M, true],
    ]);
  section(t("pdf.people"));
  peopleHeader();
  for (const id of rows) {
    ensure(ROW, peopleHeader);
    const p = who(view, id);
    const v = bal.get(id)!;
    y += ROW - 7;
    // The name and its Guest tag share 200pt, so they never reach the Paid column.
    const guest = p.guest && !p.former;
    const nameMax = 200 - (guest ? width(t("members.guest"), { size: 8 }) + 6 : 0);
    text(name(id), M, { max: nameMax });
    if (guest) {
      const nameW = Math.min(width(name(id)), nameMax);
      text(t("members.guest"), M + nameW + 6, { size: 8, color: C.muted });
    }
    text(money(paid.get(id) ?? 0, cur), PAID, { right: true });
    text(money(share.get(id) ?? 0, cur), SHARE, { right: true });
    text(
      v === 0
        ? t("balances.settled")
        : `${t(v > 0 ? "balances.getsBack" : "balances.owes")} ${money(Math.abs(v), cur)}`,
      W - M,
      {
        bold: v !== 0,
        color: v > 0 ? C.positive : v < 0 ? C.negative : C.muted,
        right: true,
      },
    );
    y += 7;
    rule(y);
  }

  // Expenses, oldest first.
  const DESC = M + 56;
  const PAYER = M + 250;
  const SPLIT = M + 345;
  const expensesHeader = () =>
    header([
      [t("pdf.date"), M],
      [t("pdf.description"), DESC],
      [t("pdf.paidBy"), PAYER],
      [t("pdf.split"), SPLIT],
      [t("pdf.amount"), W - M, true],
    ]);
  section(t("pdf.expenses"));
  if (expenses.length === 0) {
    y += 16;
    text(t("pdf.noExpenses"), M, { color: C.muted });
  } else expensesHeader();
  for (const e of [...expenses].sort((a, b) => a.spentAt - b.spentAt)) {
    ensure(ROW, expensesHeader);
    const n = Object.keys(e.shares).length;
    const split =
      e.split === "custom"
        ? t("pdf.splitCustom")
        : splitsAll(
              e,
              trip.members.map((m) => m.id),
            )
          ? t("pdf.splitAll")
          : t("pdf.splitN", { n });
    y += ROW - 7;
    text(shortDate(e.spentAt), M, { color: C.muted, max: 50 });
    text(e.description, DESC, { max: PAYER - DESC - 10 });
    text(name(e.payerId), PAYER, { max: SPLIT - PAYER - 10 });
    text(split, SPLIT, { color: C.muted, max: 90 });
    text(money(e.amountCents, cur), W - M, { right: true });
    y += 7;
    rule(y);
  }
  if (expenses.length > 0) {
    ensure(ROW);
    y += ROW - 6;
    text(t("pdf.total"), M, { bold: true });
    text(money(total, cur), W - M, { bold: true, right: true });
  }

  // Footer on every page.
  const today = longDate(Date.now());
  pages.forEach((p, i) => {
    page = p;
    y = H - 24;
    text(t("pdf.footer", { date: today }), M, { size: 8, color: C.muted });
    text(t("pdf.page", { n: i + 1, total: pages.length }), W - M, {
      size: 8,
      color: C.muted,
      right: true,
    });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  await shareFile(blob, pdfFileName(trip.name), trip.name);
}

const LOGO_H = 28;

/** public/logo.png (rendered from logo.svg by scripts/make-icons.mjs; 432×120). Null if it can't load. */
async function loadLogo(): Promise<Uint8Array | null> {
  try {
    const res = await fetch("/logo.png");
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** A small "→" drawn with lines, centered on (x, y) in PDF coordinates. */
function arrow(page: PDFPage, x: number, y: number) {
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1.2,
      color: rgb(...unit(C.muted)),
    });
  line(x, y, x + 14, y);
  line(x + 10, y + 3.5, x + 14, y);
  line(x + 10, y - 3.5, x + 14, y);
}

/** pdf-lib colors are 0–1. */
const unit = (c: Rgb): Rgb => [c[0] / 255, c[1] / 255, c[2] / 255];

/** An SVG path for a w×h rectangle with corner radius r, drawn down from its top-left corner. */
function roundedRect(w: number, h: number, r: number) {
  return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}
