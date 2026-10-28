// Stop hook: blocks "done" until typecheck, lint, unit and rules tests pass (rebuild plan, Phase 3b).
// Skips when the working tree has no changes. Exit 2 = block and show stderr to Claude.
import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (!dirty) process.exit(0);

const run = spawnSync("npm run check", { shell: true, encoding: "utf8" });
if (run.status === 0) process.exit(0);

const tail = `${run.stdout}\n${run.stderr}`.trim().split("\n").slice(-60).join("\n");
// Second stop in a row: don't loop forever, but make sure the failure reaches the user.
const note = input.stop_hook_active
  ? "Checks still fail. Tell the user plainly that the work is NOT done and why."
  : "Checks failed. Fix them before finishing.";
process.stderr.write(`${note}\n\n${tail}\n`);
process.exit(input.stop_hook_active ? 0 : 2);
