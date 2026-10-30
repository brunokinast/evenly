// One command for testing on a phone: emulators (data kept between runs in .emulator-data/), the demo
// trip, and the dev server on the local network. Stop with Ctrl+C (that also saves the emulator data).
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lanIp } from "./lan-ip.mjs";

const DATA = ".emulator-data";
const imp = existsSync(`${DATA}/firebase-export-metadata.json`) ? ` --import=${DATA}` : "";
const emulators = spawn(
  `npx firebase emulators:start --only auth,firestore --project demo-evenly${imp} --export-on-exit=${DATA}`,
  { shell: true, stdio: ["inherit", "pipe", "inherit"] },
);

await new Promise((resolve, reject) => {
  emulators.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("All emulators ready")) resolve();
  });
  // e.g. Java missing or a port in use: say so instead of waiting forever.
  emulators.on("exit", (code) => reject(new Error(`The emulators stopped before starting (exit ${code}).`)));
});
console.log("Emulators ready.");
spawnSync("node scripts/seed-demo.mjs", { shell: true, stdio: "inherit" });

const vite = spawn("npx vite --host", { shell: true, stdio: "ignore" });
const ip = lanIp();
console.log(`\nOpen on your phone (same Wi-Fi): http://${ip ?? "<this PC's IP>"}:5173\n`);

const stop = () => {
  vite.kill();
  emulators.kill("SIGINT");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
emulators.on("exit", () => process.exit(0));
