import { useMemo, useSyncExternalStore } from "react";
import { FirebaseFirestore, type DocumentData } from "@capacitor-firebase/firestore";
import { isWellFormed } from "@/domain/balances";
import { sortMembers } from "@/domain/members";
import type { Expense, Member, Trip } from "@/domain/types";
import { firebaseReady } from "./firebase";
import { mark, source } from "@/lib/perf";
import { peekLive, useLive, warmLive, type Live } from "./live";

// Live hooks for on-screen data (docs/architecture.md). Each is one shared Firestore listener.

type MemberDoc = { name: string; uid?: string; joinedAt: number };

export function toTrip(id: string, d: DocumentData): Trip {
  const members: Member[] = Object.entries(d.members as Record<string, MemberDoc>).map(([mid, m]) => ({
    id: mid,
    name: m.name,
    ...(m.uid !== undefined && { uid: m.uid }),
    joinedAt: m.joinedAt,
  }));
  return {
    id,
    name: d.name,
    icon: d.icon,
    currency: d.currency,
    ownerUid: d.ownerUid,
    createdAt: d.createdAt,
    members: sortMembers(members),
    memberIdsByUid: d.memberIdsByUid,
    invite: d.invite ?? null,
  };
}

/** Starts a plugin listener; returns a stop function that works even before the listener is attached. */
function listen(attach: () => Promise<string>) {
  let stopped = false;
  let id: string | null = null;
  void firebaseReady.then(attach).then((callbackId) => {
    id = callbackId;
    if (stopped) void FirebaseFirestore.removeSnapshotListener({ callbackId });
  });
  return () => {
    stopped = true;
    if (id) void FirebaseFirestore.removeSnapshotListener({ callbackId: id });
  };
}

/**
 * Gotcha (TRIP-7, MEM-9): when a trip listener loses access (trip deleted or I was removed), Firestore's
 * offline cache can keep the old trip document, and Home's query may keep showing it until a reload. So a
 * trip whose listener reported "gone" stays hidden from Home while the query still returns that exact
 * version of it; any newer version (e.g. after rejoining) shows normally.
 */
const lostTrips = new Map<string, string>(); // tripId → raw JSON of the version we lost access to
const rawOf = new WeakMap<Trip, string>();
let lostVersion = 0;
const lostListeners = new Set<() => void>();

function loseTrip(tripId: string, raw: string) {
  lostTrips.set(tripId, raw);
  lostVersion++;
  lostListeners.forEach((l) => l());
}

/** JSON with sorted keys: the native SDK's maps don't promise the same key order in both listeners. */
function rawJson(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );
}

const withoutLost = (trips: Trip[]) => trips.filter((trip) => lostTrips.get(trip.id) !== rawOf.get(trip));

/** TRIP-5, KI-1, KI-2: Home's single query, newest first. */
export function useMyTrips(uid: string): Live<Trip[]> {
  const live = useMyTripsQuery(uid);
  const version = useSyncExternalStore(
    (l) => {
      lostListeners.add(l);
      return () => lostListeners.delete(l);
    },
    () => lostVersion,
  );
  return useMemo(
    () => (live.status === "ready" ? { status: "ready", data: withoutLost(live.data) } : live),
    [live, version], // eslint-disable-line react-hooks/exhaustive-deps
  );
}

/**
 * My trips, for writes that touch all of them (ID-5): Home's live list, or, before Home ever loaded (the
 * Welcome name of a user who already has trips, e.g. migrated), one read of the same query. Not on screen.
 */
export async function myTripsForWrite(uid: string): Promise<Trip[]> {
  const live = peekLive<Trip[]>(`myTrips/${uid}`);
  if (live?.status === "ready") return withoutLost(live.data);
  await firebaseReady;
  const { snapshots } = await FirebaseFirestore.getCollection(myTripsQuery(uid));
  return snapshots.filter((s) => s.data).map((s) => toTrip(s.id, s.data!));
}

const myTripsQuery = (uid: string) => ({
  reference: "trips",
  compositeFilter: {
    type: "and" as const,
    queryConstraints: [
      { type: "where" as const, fieldPath: "memberUids", opStr: "array-contains" as const, value: uid },
    ],
  },
});

function useMyTripsQuery(uid: string): Live<Trip[]> {
  return useLive(`myTrips/${uid}`, (emit) =>
    listen(() =>
      FirebaseFirestore.addCollectionSnapshotListener(myTripsQuery(uid), (event, error) => {
        if (error || !event) return emit({ status: "gone" });
        mark(`snapshot:trips:${source(event.snapshots[0]?.metadata)}`, event.snapshots.length);
        const trips = event.snapshots
          .filter((s) => s.data)
          .map((s) => {
            const trip = toTrip(s.id, s.data!);
            rawOf.set(trip, rawJson(s.data));
            return trip;
          });
        emit({ status: "ready", data: trips.sort((a, b) => b.createdAt - a.createdAt) });
      }),
    ),
  );
}

export function useTrip(tripId: string): Live<Trip> {
  return useLive(`trip/${tripId}`, tripListener(tripId));
}

const tripListener = (tripId: string) => (emit: (value: Live<Trip>) => void) => {
  let last: string | null = null;
  return listen(() =>
    FirebaseFirestore.addDocumentSnapshotListener({ reference: `trips/${tripId}` }, (event, error) => {
      if (error || !event?.snapshot.data) {
        if (last) loseTrip(tripId, last);
        return emit({ status: "gone" });
      }
      mark(`snapshot:trip:${source(event.snapshot.metadata)}`);
      last = rawJson(event.snapshot.data);
      emit({ status: "ready", data: toTrip(tripId, event.snapshot.data) });
    }),
  );
};

export function useExpenses(tripId: string): Live<Expense[]> {
  return useLive(`expenses/${tripId}`, expensesListener(tripId));
}

/** F6 (docs/performance.md): a trip's listeners start on touch-down, ~0.1 s before the tap opens it. */
export function warmTrip(tripId: string) {
  warmLive(`trip/${tripId}`, tripListener(tripId));
  warmLive(`expenses/${tripId}`, expensesListener(tripId));
}

const expensesListener = (tripId: string) => (emit: (value: Live<Expense[]>) => void) =>
  listen(() =>
    FirebaseFirestore.addCollectionSnapshotListener(
      { reference: `trips/${tripId}/expenses` },
      (event, error) => {
        if (error || !event) return emit({ status: "gone" });
        mark(`snapshot:expenses:${source(event.snapshots[0]?.metadata)}`, event.snapshots.length);
        const expenses = event.snapshots
          .filter((s) => s.data)
          .map((s) => ({ id: s.id, ...(s.data as Omit<Expense, "id">) }))
          .filter(isWellFormed); // BAL-1: a malformed expense never breaks the balances
        emit({ status: "ready", data: expenses });
      },
    ),
  );
