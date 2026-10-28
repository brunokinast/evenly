import { useSyncExternalStore } from "react";
import { FirebaseAuthentication, type User } from "@capacitor-firebase/authentication";
import { firebaseReady } from "./firebase";

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

async function start() {
  await firebaseReady;
  // The plugin holds the first auth state until a listener is attached, so a restored session (ID-4)
  // arrives here before we'd ever create a new identity.
  await FirebaseAuthentication.addListener("authStateChange", ({ user }) => {
    if (user) set(fromUser(user));
    else void signIn();
  });
}
start().catch(() => set({ status: "error" })); // ID-6 rather than a blank screen

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

/** ID-6 "Try again". */
export function retrySignIn() {
  return signIn();
}

/**
 * ID-1..3, ID-5: saves the display name in the Auth profile. The Auth profile has no change listener,
 * so this is the one place that re-reads after a write. (Trips slice: also batch-update the trip copies.)
 */
export async function setDisplayName(name: string) {
  await FirebaseAuthentication.updateProfile({ displayName: name });
  const { user } = await FirebaseAuthentication.getCurrentUser();
  if (user) set(fromUser(user));
}
