// PDF-1..5. Loaded on demand (listed in scripts/check-bundle-size.mjs ON_DEMAND), so jsPDF isn't startup code.
import { jsPDF } from "jspdf";
import { balances, settlements, totalSpent } from "@/domain/balances";
import { pdfFileName } from "@/domain/trips";
import { longDate, money, t, tn } from "@/i18n";
import { label, who } from "./labels";
import type { TripView } from "./TripScreen";

const MARGIN = 48;
const WIDTH = 595.28; // A4 in pt
const HEIGHT = 841.89;

export async function exportTripPdf(view: TripView) {
  const { trip, expenses } = view;
  const cur = trip.currency;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const text = (
    s: string,
    x: number,
    opts: { size?: number; bold?: boolean; right?: boolean; max?: number } = {},
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    const fitted = opts.max ? fit(doc, s, opts.max) : s;
    doc.text(fitted, x, y, opts.right ? { align: "right" } : undefined);
  };
  const heading = (s: string) => {
    ensure(40);
    y += 14;
    text(s, MARGIN, { size: 13, bold: true });
    y += 18;
  };
  const line = (left: string, right: string, opts: { bold?: boolean } = {}) => {
    ensure(16);
    text(left, MARGIN, { ...opts, max: WIDTH - 2 * MARGIN - 110 });
    text(right, WIDTH - MARGIN, { ...opts, right: true });
    y += 16;
  };

  // Header: trip name, created date, currency.
  text(t("pdf.summary"), MARGIN, { size: 10 });
  y += 24;
  text(trip.name, MARGIN, { size: 20, bold: true, max: WIDTH - 2 * MARGIN });
  y += 20;
  text(
    `${t("pdf.created", { date: longDate(trip.createdAt) })} · ${t("pdf.currency", { currency: cur })}`,
    MARGIN,
  );
  y += 8;

  heading(t("pdf.members"));
  for (const m of trip.members)
    line(who(view, m.id).name, view.people.get(m.id)?.guest ? t("members.guest") : "");

  heading(t("pdf.expenses"));
  const sorted = [...expenses].sort((a, b) => a.spentAt - b.spentAt);
  ensure(16);
  doc.setTextColor(110);
  text(t("pdf.date"), MARGIN, { size: 9 });
  text(t("pdf.description"), MARGIN + 80, { size: 9 });
  text(t("pdf.paidBy"), MARGIN + 290, { size: 9 });
  text(t("pdf.amount"), WIDTH - MARGIN, { size: 9, right: true });
  doc.setTextColor(0);
  y += 16;
  for (const e of sorted) {
    ensure(16);
    text(longDate(e.spentAt), MARGIN, { max: 76 });
    text(e.description, MARGIN + 80, { max: 200 });
    text(who(view, e.payerId).name, MARGIN + 290, { max: 110 });
    text(money(e.amountCents, cur), WIDTH - MARGIN, { right: true });
    y += 16;
  }
  if (sorted.length === 0) line(t("pdf.none"), "");

  heading(t("pdf.totals"));
  const total = totalSpent(expenses);
  line(t("expenses.total"), money(total, cur), { bold: true });
  line(t("balances.expenses"), tn("expenses.count", expenses.length));
  line(t("balances.perPerson"), money(Math.round(total / trip.members.length), cur));

  const order = trip.members.map((m) => m.id);
  const bal = balances(order, expenses);
  heading(t("pdf.balances"));
  for (const [id, v] of [...bal].sort((a, b) => b[1] - a[1])) {
    const status = v > 0 ? t("balances.getsBack") : v < 0 ? t("balances.owes") : t("balances.settled");
    line(who(view, id).name, v === 0 ? status : `${status} ${money(Math.abs(v), cur)}`);
  }

  heading(t("pdf.settlements"));
  const pays = settlements(bal, order);
  for (const p of pays) {
    line(t("balances.pays", { from: label(view, p.from), to: label(view, p.to) }), money(p.cents, cur));
  }
  if (pays.length === 0) line(t("balances.allSettled"), "");

  await deliver(doc.output("blob"), pdfFileName(trip.name), trip.name);
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
