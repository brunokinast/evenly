// APP-4 budget (docs/architecture.md): JavaScript loaded at startup ≤ 350 kB gzipped.
// Counts every built chunk, because the Firebase plugins load their SDKs with dynamic imports right at
// startup. Only chunks that load on demand (e.g. PDF export) are excluded, by name in ON_DEMAND.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET = 350 * 1024;
// PDF export (jsPDF and the helpers it imports lazily) loads only when "Export as PDF" is tapped.
const ON_DEMAND = [/^exportPdf-/, /^index\.es-/, /^html2canvas-/, /^purify\.es-/];

const dir = join("dist", "assets");
const files = readdirSync(dir).filter((f) => f.endsWith(".js") && !ON_DEMAND.some((re) => re.test(f)));
const sizes = files.map((f) => [f, gzipSync(readFileSync(join(dir, f))).length]);
const total = sizes.reduce((sum, [, n]) => sum + n, 0);

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
for (const [f, n] of sizes.sort((a, b) => b[1] - a[1])) console.log(`  ${kb(n).padStart(9)}  ${f}`);
console.log(`Startup JS (gzip): ${kb(total)} of ${kb(BUDGET)}`);
if (total > BUDGET) {
  console.error("Over the APP-4 budget. Load rarely used code on demand and list it in ON_DEMAND.");
  process.exit(1);
}
