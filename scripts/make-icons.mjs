// Renders public/icon.svg to the PNG sizes iOS and Android install prompts need, and public/logo.svg to the
// PNG the PDF header uses (jsPDF can't draw SVG). Run after changing the icon or the logo.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const icon = readFileSync("public/icon.svg", "utf8");
// iOS and Android masks crop the icon themselves, so those get a full-bleed square tile.
const square = icon.replace(/rx="112"/, 'rx="0"');
const browser = await chromium.launch();
for (const [file, svg, size, pad] of [
  ["public/apple-touch-icon.png", square, 180, 0],
  ["public/icon-192.png", icon, 192, 0],
  ["public/icon-512.png", icon, 512, 0],
  ["public/icon-maskable-512.png", square, 512, 0.1],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - 2 * pad));
  await page.setContent(
    `<body style="margin:0;background:#F2B233;display:grid;place-items:center;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace("<svg", `<svg width="${inner}" height="${inner}"`)}</div></body>`,
  );
  await page.screenshot({ path: file, omitBackground: svg === icon });
  await page.close();
}

const logo = readFileSync("public/logo.svg", "utf8");
const [, , lw, lh] = logo
  .match(/viewBox="([^"]+)"/)[1]
  .split(" ")
  .map(Number);
const h = 120; // 3× the 40pt it is drawn at in the PDF
const w = Math.round((h * lw) / lh);
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.setContent(
  `<body style="margin:0">${logo.replace("<svg", `<svg width="${w}" height="${h}"`)}</body>`,
);
await page.screenshot({ path: "public/logo.png", omitBackground: true });
await browser.close();
