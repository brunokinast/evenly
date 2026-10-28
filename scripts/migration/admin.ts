// Admin SDK access for the Phase 6 scripts: the emulators (--emulator) or the real project with the
// Firebase CLI login (`firebase login`), so no service-account key has to exist on disk.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { initializeApp, refreshToken, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  Timestamp,
  GeoPoint,
  DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import type { Backup, Collection, DocNode, Value } from "./map";

export const REAL_PROJECT = "evenly-app-6f5f2";
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
  const app = initializeApp({
    projectId: REAL_PROJECT,
    credential: refreshToken({
      type: "authorized_user",
      client_id: api.clientId(),
      client_secret: api.clientSecret(),
      refresh_token: token,
    }),
  });
  return { app, db: getFirestore(app), projectId: REAL_PROJECT };
}

export const auth = getAuth;

function toJson(v: unknown): Value {
  if (v instanceof Timestamp) return { __type: "timestamp", ms: v.toMillis() };
  if (v instanceof GeoPoint) return { __type: "geo", lat: v.latitude, lng: v.longitude };
  if (v instanceof DocumentReference) return { __type: "ref", path: v.path };
  if (Buffer.isBuffer(v) || v instanceof Uint8Array)
    return { __type: "bytes", base64: Buffer.from(v).toString("base64") };
  if (Array.isArray(v)) return v.map(toJson);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJson(x)]));
  return v as Value;
}

function fromJson(db: Firestore, v: Value): unknown {
  if (Array.isArray(v)) return v.map((x) => fromJson(db, x));
  if (v && typeof v === "object") {
    switch (v.__type) {
      case "timestamp":
        return Timestamp.fromMillis(v.ms as number);
      case "geo":
        return new GeoPoint(v.lat as number, v.lng as number);
      case "ref":
        return db.doc(v.path as string);
      case "bytes":
        return Buffer.from(v.base64 as string, "base64");
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromJson(db, x)]));
  }
  return v;
}

/** Everything in the database, including documents that only exist as parents of subcollections. */
export async function readAll(db: Firestore, projectId: string): Promise<Backup> {
  async function readCollection(ref: FirebaseFirestore.CollectionReference): Promise<Collection> {
    const out: Collection = {};
    const refs = await ref.listDocuments();
    const snaps = refs.length ? await db.getAll(...refs) : [];
    for (const snap of snaps) {
      const node: DocNode = {
        data: snap.exists ? (toJson(snap.data()) as Record<string, Value>) : null,
        collections: {},
      };
      for (const sub of await snap.ref.listCollections())
        node.collections[sub.id] = await readCollection(sub);
      out[snap.id] = node;
    }
    return out;
  }
  const backup: Backup = { projectId, takenAt: Date.now(), collections: {} };
  for (const c of await db.listCollections()) backup.collections[c.id] = await readCollection(c);
  return backup;
}

export function saveBackup(backup: Backup): string {
  mkdirSync("backups", { recursive: true });
  const file = join(
    "backups",
    `${backup.projectId}-${new Date(backup.takenAt).toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(file, JSON.stringify(backup, null, 1));
  return file;
}

/** Emulator only: writes a backup's documents back as they were. */
export async function restore(db: Firestore, backup: Backup) {
  const writes: [string, Record<string, Value>][] = [];
  const walk = (path: string, c: Collection) => {
    for (const [id, node] of Object.entries(c)) {
      if (node.data) writes.push([`${path}/${id}`, node.data]);
      for (const [sub, docs] of Object.entries(node.collections)) walk(`${path}/${id}/${sub}`, docs);
    }
  };
  for (const [name, docs] of Object.entries(backup.collections)) walk(name, docs);
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [path, data] of writes.slice(i, i + 400))
      batch.set(db.doc(path), fromJson(db, data) as object);
    await batch.commit();
  }
  return writes.length;
}
