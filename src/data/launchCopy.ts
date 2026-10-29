import type { Trip } from "@/domain/types";
import { nativeFirebase } from "./firebase";

/**
 * APP-10, ADR 0007: on the website, my identity and Home's trip list from the last visit, shown while Auth
 * re-checks the saved login with the server (Firestore waits for that even to read its offline cache).
 * The only data kept outside Firestore; the Android app needs none (its Auth answers at once).
 */
const KEY = "evenly.launchCopy";
type Copy = { uid: string; name: string; trips: Trip[] | null }; // trips null: no live list saved yet

let copy: Copy | null = nativeFirebase ? null : read();

function read(): Copy | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as Copy | null;
    return value?.uid && value.name && (value.trips === null || Array.isArray(value.trips)) ? value : null;
  } catch {
    return null; // Storage blocked or unreadable: launch waits for Auth as before.
  }
}

function write(next: Copy | null) {
  copy = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: no copy next time.
  }
}

/** The identity to start as before Auth answers (web only). */
export const launchIdentity = (): { uid: string; name: string } | null =>
  copy && { uid: copy.uid, name: copy.name };

/** Home's trips from the last visit, for this identity, until its live list arrives. */
export const launchTrips = (uid: string): Trip[] | null => (copy?.uid === uid ? copy.trips : null);

/** Auth answered (null: no saved login): keep the copy for this identity, drop it for any other. */
export function confirmIdentity(uid: string | null, name: string | null) {
  if (nativeFirebase) return;
  if (!uid || !name) write(null);
  else if (copy?.uid !== uid) write({ uid, name, trips: null });
  else if (copy.name !== name) write({ ...copy, name });
}

/** Home's live list, saved for the next launch. */
export function saveTrips(uid: string, trips: Trip[]) {
  if (!nativeFirebase && copy?.uid === uid) write({ ...copy, trips });
}
