// Stop hook: blocks "done" until typecheck, lint, unit and rules tests pass (rebuild plan, Phase 3b).
// Skips when nothing but docs, specs or mock-ups changed. Exit 2 = block and show stderr to Claude.
import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Run from the project root, whatever folder the session's shell is in.
const cwd = fileURLToPath(new URL("../..", import.meta.url));

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
// Only code needs the checks: skip when nothing changed, or only docs, specs and mock-ups did.
const changed = execSync("git status --porcelain", { cwd, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, ""));
const docsOnly = (path) => /^(docs|specs)\//.test(path) || /\.md$/.test(path);
if (changed.every(docsOnly)) process.exit(0);

const run = spawnSync("npm run check", { cwd, shell: true, encoding: "utf8" });
if (run.status === 0) process.exit(0);

const tail = `${run.stdout}\n${run.stderr}`.trim().split("\n").slice(-60).join("\n");
// Second stop in a row: don't loop forever, but make sure the failure reaches the user.
const note = input.stop_hook_active
  ? "Checks still fail. Tell the user plainly that the work is NOT done and why."
  : "Checks failed. Fix them before finishing.";
process.stderr.write(`${note}\n\n${tail}\n`);
process.exit(input.stop_hook_active ? 0 : 2);
