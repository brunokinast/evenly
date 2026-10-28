// PDF-1..5, specs/design.md "PDF". Loaded on demand (listed in scripts/check-bundle-size.mjs ON_DEMAND),
// so jsPDF isn't startup code.
import { jsPDF } from "jspdf";
import { balances, settlements, totalSpent } from "@/domain/balances";
import { byListOrder } from "@/domain/members";
import { pdfFileName } from "@/domain/trips";
import { longDate, money, shortDate, t, tn } from "@/i18n";
import { who } from "./labels";
import type { TripView } from "./TripScreen";

const W = 595.28; // A4 in pt
const H = 841.89;
const M = 40;
const ROW = 22;
type Rgb = [number, number, number];
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

type TextOpts = { size?: number; bold?: boolean; color?: Rgb; right?: boolean; max?: number; caps?: boolean };

export async function exportTripPdf(view: TripView) {
  const { trip, expenses } = view;
  const cur = trip.currency;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = M;
  // Real names, not "You": the PDF is shared with others.
  const name = (id: string) => who(view, id).name;

  const text = (s: string, x: number, o: TextOpts = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size ?? 10);
    doc.setTextColor(...(o.color ?? C.fg));
    const str = o.caps ? s.toLocaleUpperCase() : s;
    // jsPDF leaves the letter spacing out of right alignment; shift caps back inside the margin.
    const shift = o.caps && o.right ? 0.5 * str.length : 0;
    doc.text(o.max ? fit(doc, str, o.max) : str, x - shift, y, {
      align: o.right ? "right" : "left",
      charSpace: o.caps ? 0.5 : 0,
    });
  };
  const rule = (at: number) => {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.6);
    doc.line(M, at, W - M, at);
  };
  /** Starts a new page when `h` more points don't fit; `again` redraws a table header there. */
  const ensure = (h: number, again?: () => void) => {
    if (y + h <= H - M - 24) return;
    doc.addPage();
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

  // Header: the app mark, "Evenly · Trip summary", the trip name and its facts.
  doc.setFillColor(...C.accent);
  doc.roundedRect(M, y, 26, 26, 6, 6, "F");
  doc.setFillColor(...C.accentFg);
  doc.roundedRect(M + 7.5, y + 9.2, 11, 2.6, 1.3, 1.3, "F");
  doc.roundedRect(M + 7.5, y + 14.2, 11, 2.6, 1.3, 1.3, "F");
  y += 17.5;
  text("Evenly", M + 36, { size: 12, bold: true });
  text(t("pdf.summary"), W - M, { size: 10, color: C.muted, right: true });
  y += 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const nameLines = doc.splitTextToSize(trip.name, W - 2 * M) as string[];
  for (const l of nameLines) {
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
    doc.setFillColor(...C.surface2);
    doc.roundedRect(x, y, tileW, 54, 8, 8, "F");
    const top = y;
    y = top + 20;
    text(k, x + 12, { size: 9, color: C.muted, max: tileW - 24 });
    y = top + 41;
    text(v, x + 12, { size: 15, bold: true, max: tileW - 24 });
    y = top;
  });
  y += 54;

  // Suggested payments, in the MEM-6 order (BAL-8).
  const order = trip.members.map((m) => m.id);
  const bal = balances(order, expenses);
  const by = byListOrder(view.listed);
  const pays = settlements(bal, order).sort((a, b) => by(a.from, b.from) || by(a.to, b.to));
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
    const fromW = Math.min(doc.getTextWidth(from), 190);
    arrow(doc, M + fromW + 8, y - 3.5);
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
  for (const id of [...bal.keys()].sort(by)) {
    ensure(ROW, peopleHeader);
    const p = who(view, id);
    const v = bal.get(id)!;
    y += ROW - 7;
    // The name and its Guest tag share 200pt, so they never reach the Paid column.
    const guest = p.guest && !p.former;
    doc.setFontSize(8);
    const nameMax = 200 - (guest ? doc.getTextWidth(t("members.guest")) + 6 : 0);
    text(name(id), M, { max: nameMax });
    if (guest) {
      const nameW = Math.min(doc.getTextWidth(name(id)), nameMax);
      text(t("members.guest"), M + nameW + 6, { size: 8, color: C.muted });
    }
    text(money(paid.get(id) ?? 0, cur), PAID, { right: true });
    text(money(share.get(id) ?? 0, cur), SHARE, { right: true });
    text(
      v === 0
        ? t("balances.settled")
        : `${t(v > 0 ? "balances.getsBack" : "balances.owes")} ${money(Math.abs(v), cur)}`,
      W - M,
      { bold: v !== 0, color: v > 0 ? C.positive : v < 0 ? C.negative : C.muted, right: true },
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
        : n === trip.members.length && trip.members.every((m) => m.id in e.shares)
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
  const pages = doc.getNumberOfPages();
  const today = longDate(Date.now());
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    y = H - 24;
    text(t("pdf.footer", { date: today }), M, { size: 8, color: C.muted });
    text(t("pdf.page", { n: i, total: pages }), W - M, { size: 8, color: C.muted, right: true });
  }

  await deliver(doc.output("blob"), pdfFileName(trip.name), trip.name);
}

/** A small "→" drawn with lines (the PDF's built-in font has no arrow glyph). */
function arrow(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(1.2);
  doc.line(x, y, x + 14, y);
  doc.line(x + 10, y - 3.5, x + 14, y);
  doc.line(x + 10, y + 3.5, x + 14, y);
}

/** Truncates text with "…" to fit a width. */
function fit(doc: jsPDF, s: string, max: number) {
  if (doc.getTextWidth(s) <= max) return s;
  let out = s;
  while (out.length > 1 && doc.getTextWidth(`${out}…`) > max) out = out.slice(0, -1);
  return `${out}…`;
}

/** PDF-4: the share sheet where it can share files, otherwise a download. */
async function deliver(blob: Blob, name: string, title: string) {
  const file = new File([blob], name, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // The user closed the share sheet.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
