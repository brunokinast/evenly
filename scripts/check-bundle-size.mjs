// APP-4 budget (docs/architecture.md): initial JavaScript ≤ 250 kB gzipped.
// "Initial" = scripts index.html loads plus their static imports; lazy chunks are excluded.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET = 250 * 1024;
const dist = "dist";
const html = readFileSync(join(dist, "index.html"), "utf8");
const queue = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="\/([^"]+\.js)"/g)].map((m) => m[1]);
const seen = new Set();
let total = 0;
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  const code = readFileSync(join(dist, file));
  total += gzipSync(code).length;
  // Static imports between chunks look like: import{a as b}from"./chunk-abc.js"
  for (const m of code.toString().matchAll(/import\s*(?:[\w${},\s*]*?from\s*)?["']\.\/([^"']+\.js)["']/g)) {
    queue.push(`assets/${m[1]}`);
  }
}
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`Initial JS (gzip): ${kb(total)} of ${kb(BUDGET)} in ${seen.size} file(s)`);
if (total > BUDGET) {
  console.error("Over the APP-4 budget. Lazy-load rarely used code.");
  process.exit(1);
}
