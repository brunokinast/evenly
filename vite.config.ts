import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // The PDF export's libraries load only on export; pre-bundle them at dev-server start, or discovering them
  // then reloads every open page (breaks e2e tests running in parallel).
  optimizeDeps: { include: ["pdf-lib", "fontkit", "woff2-encoder/decompress"] },
  plugins: [
    react(),
    tailwindcss(),
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
      workbox: { globPatterns: ["**/*.{js,css,html,svg,woff2}"], navigateFallback: "/index.html" },
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
