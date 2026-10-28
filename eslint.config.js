import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const firebase = {
  group: ["firebase", "firebase/*", "@firebase/*", "@capacitor-firebase/*"],
  message: "Only src/data/ may use Firebase (ADR 0002).",
};
const layer = (names, why) => ({
  group: names.flatMap((n) => [`@/${n}`, `@/${n}/*`, `**/${n}/*`]),
  message: why,
});

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "coverage", "playwright-report", "test-results", "android", "ios"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/data/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [firebase] }] },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "react", message: "src/domain/ is pure TypeScript." }],
          patterns: [
            firebase,
            layer(["data", "screens", "components", "app", "i18n"], "src/domain/ is pure TypeScript."),
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            firebase,
            layer(["data", "screens"], "Components get data through props; screens use data hooks."),
          ],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts", "e2e/**/*.ts", "*.config.ts", "scripts/**"],
    languageOptions: { globals: globals.node },
  },
);
