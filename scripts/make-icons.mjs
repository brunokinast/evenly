// Renders public/icon.svg to the PNG sizes iOS and Android install prompts need. Run after changing the icon.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("public/icon.svg", "utf8");
const browser = await chromium.launch();
for (const [file, size, pad] of [
  ["public/apple-touch-icon.png", 180, 0],
  ["public/icon-192.png", 192, 0],
  ["public/icon-512.png", 512, 0],
  ["public/icon-maskable-512.png", 512, 0.1],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - 2 * pad));
  await page.setContent(
    `<body style="margin:0;background:#F2B233;display:grid;place-items:center;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace("<svg", `<svg width="${inner}" height="${inner}"`)}</div></body>`,
  );
  await page.screenshot({ path: file, omitBackground: pad === 0 });
  await page.close();
}
await browser.close();
