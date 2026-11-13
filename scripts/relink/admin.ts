// Admin SDK access for scripts/relink.ts: the emulators (--emulator) or the real project with the
// Firebase CLI login (`firebase login`), so no service-account key has to exist on disk.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { applicationDefault, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const REAL_PROJECT = "evenly-app-6f5f2";
/** Firestore's most writes in one batch. */
export const BATCH_LIMIT = 500;
const EMULATOR_PROJECT = "demo-evenly"; // the LAN preview's project

export function connect(emulator: boolean): { app: App; db: Firestore; projectId: string } {
  process.env.METADATA_SERVER_DETECTION = "none"; // not on Google Cloud: skip the slow metadata lookup
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    const app = initializeApp({ projectId: EMULATOR_PROJECT });
    return { app, db: getFirestore(app), projectId: EMULATOR_PROJECT };
  }
  const require = createRequire(import.meta.url);
  const api = require("firebase-tools/lib/api") as { clientId(): string; clientSecret(): string };
  const store = JSON.parse(
    readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
  ) as { tokens?: { refresh_token?: string } };
  const token = store.tokens?.refresh_token;
  if (!token) throw new Error("Not logged in: run `npx firebase login` first.");
  // Firestore only takes application default credentials, so the login goes in a temporary ADC file.
  const adc = join(tmpdir(), `evenly-adc-${process.pid}.json`);
  writeFileSync(
    adc,
    JSON.stringify({
      type: "authorized_user",
      client_id: api.clientId(),
      client_secret: api.clientSecret(),
      refresh_token: token,
      quota_project_id: REAL_PROJECT,
    }),
  );
  process.on("exit", () => rmSync(adc, { force: true }));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adc;
  const app = initializeApp({ projectId: REAL_PROJECT, credential: applicationDefault() });
  return { app, db: getFirestore(app), projectId: REAL_PROJECT };
}

export const auth = getAuth;
