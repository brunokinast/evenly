import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";

/**
 * Firebase's web SDKs load through the Capacitor plugins' lazy `web` chunks, which the page would only ask for
 * after the main chunk has downloaded and run. Preload them from index.html so they download alongside it.
 */
function preloadFirebase(): Plugin {
  return {
    name: "preload-firebase",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle }) {
        return Object.values(bundle ?? {})
          .filter(
            (c) =>
              c.type === "chunk" &&
              !c.isEntry &&
              c.moduleIds.some((id) =>
                /@(capacitor-)?firebase[\\/](firestore|auth|authentication)[\\/]/.test(id),
              ),
          )
          .map((c) => ({
            tag: "link",
            attrs: { rel: "modulepreload", crossorigin: "", href: `/${c.fileName}` },
            injectTo: "head" as const,
          }));
      },
    },
  };
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Lazily imported libraries (PDF export, firebase/auth in src/data/firebase.ts): pre-bundle them at dev-server start, or discovering them
  // then reloads every open page (breaks e2e tests running in parallel).
  optimizeDeps: { include: ["pdf-lib", "fontkit", "woff2-encoder/decompress", "firebase/auth"] },
  plugins: [
    react(),
    tailwindcss(),
    preloadFirebase(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // src/main.tsx registers it on the web only
      includeAssets: ["fonts/hanken-grotesk.woff2", "icon.svg", "apple-touch-icon.png", "logo.png"],
      manifest: {
        name: "Evenly",
        short_name: "Evenly",
        description: "Split trip expenses with friends",
        theme_color: "#F6F7F9",
        background_color: "#F6F7F9",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // On-demand code (PDF export with its fonts, ~490 kB; the ?perf panel) isn't pre-downloaded with every
        // install/update: it's cached the first time it's used (hashed names, so never stale).
        globIgnores: ["**/exportPdf-*", "**/noto-sans-*", "**/PerfPanel-*"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(exportPdf|noto-sans|PerfPanel)-/,
            handler: "CacheFirst",
            options: { cacheName: "on-demand", expiration: { maxEntries: 10 } }, // old versions age out
          },
        ],
        navigateFallback: "/index.html",
        // Control the first session too, so on-demand code used then is cached already.
        clientsClaim: true,
      },
    }),
  ],
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
          environment: "jsdom",
        },
      },
      {
        extends: true,
        test: {
          name: "rules",
          include: ["tests/rules/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
    ],
  },
});
