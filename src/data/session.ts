import { useSyncExternalStore } from "react";
import { FirebaseAuthentication, type User } from "@capacitor-firebase/authentication";
import { Capacitor } from "@capacitor/core";
import { renameMeInTrips } from "./commands";
import { firebaseReady, usesEmulators } from "./firebase";
import { myTripsForWrite } from "./trips";

export type Session =
  | { status: "loading" }
  | { status: "error" } // ID-6: couldn't create the identity
  | { status: "ready"; uid: string; name: string | null }; // name null → Welcome (ID-2)

let session: Session = { status: "loading" };
const listeners = new Set<() => void>();

function set(next: Session) {
  session = next;
  listeners.forEach((l) => l());
}

function fromUser(user: User): Session {
  return { status: "ready", uid: user.uid, name: user.displayName || null };
}

async function signIn() {
  set({ status: "loading" });
  try {
    await FirebaseAuthentication.signInAnonymously(); // ID-1; authStateChange delivers the user
  } catch {
    set({ status: "error" });
  }
}

let listening = false;

async function start() {
  set({ status: "loading" });
  await firebaseReady;
  // The plugin holds the first auth state until a listener is attached, so a restored session (ID-4)
  // arrives here before we'd ever create a new identity.
  let heard = false;
  await FirebaseAuthentication.addListener("authStateChange", ({ user }) => {
    heard = true;
    if (user) set(fromUser(user));
    else void signIn();
  });
  listening = true;
  if (Capacitor.isNativePlatform()) void afterReload(() => heard);
}

/**
 * After a WebView reload (Android) the native plugin already gave its first state to the old page and
 * sends nothing new: read the signed-in user directly, or sign in if there is none and still no event.
 */
async function afterReload(heard: () => boolean) {
  try {
    const { user } = await FirebaseAuthentication.getCurrentUser();
    if (user) {
      if (session.status === "loading") set(fromUser(user));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // a first launch's own event comes first
    if (!heard() && session.status === "loading") await signIn();
  } catch {
    if (session.status === "loading") set({ status: "error" });
  }
}
const begin = () => start().catch(() => set({ status: "error" })); // ID-6 rather than a blank screen
void begin();

/** The signed-in user, live. Started once at app load. */
export function useSession(): Session {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

/** The signed-in user with a name, for screens behind the session gate. */
export function useMe(): { uid: string; name: string } {
  const s = useSession();
  if (s.status !== "ready" || !s.name) throw new Error("useMe() outside the session gate");
  return { uid: s.uid, name: s.name };
}

/** True on the local emulators, where testing helpers may show. */
export const canResetForTesting = usesEmulators;

/**
 * Testing only (local emulators): forget this identity and this device's settings, back to Welcome.
 * The old identity stays in its trips, as a member nobody can sign in as.
 */
export async function resetForTesting() {
  try {
    localStorage.clear();
  } catch {
    // Storage blocked: nothing to clear.
  }
  await FirebaseAuthentication.signOut(); // authStateChange → a new anonymous identity → Welcome
}

/** ID-6 "Try again": sign in again, or start over if setup itself failed (no auth listener yet). */
export function retrySignIn() {
  return listening ? signIn() : begin();
}

/** The signed-in user's id. Only called by writes, which run after the session gate. */
export function myUid(): string {
  if (session.status !== "ready") throw new Error("Not signed in");
  return session.uid;
}

/**
 * ID-1..3, ID-5: saves the display name in the Auth profile, then its copies in my trips (one batch).
 * The Auth profile has no change listener, so this is the one place that re-reads after a write.
 */
export async function setDisplayName(name: string) {
  await FirebaseAuthentication.updateProfile({ displayName: name });
  const { user } = await FirebaseAuthentication.getCurrentUser();
  if (user) set(fromUser(user));
  await renameMeInTrips(await myTripsForWrite(myUid()), name);
}
