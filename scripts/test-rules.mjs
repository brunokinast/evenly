// Runs the rules tests against the Firestore emulator: reuses one already running on :8080 (e.g. the LAN
// preview), otherwise starts a temporary one.
import { spawnSync } from "node:child_process";

const running = await fetch("http://127.0.0.1:8080").then(
  () => true,
  () => false,
);
const cmd = running
  ? "vitest run --project rules"
  : 'firebase emulators:exec --only firestore --project demo-evenly "vitest run --project rules"';
const { status } = spawnSync(cmd, { shell: true, stdio: "inherit" });
process.exit(status ?? 1);
