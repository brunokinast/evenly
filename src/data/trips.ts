import { useMemo } from "react";
import { FirebaseFirestore, type DocumentData } from "@capacitor-firebase/firestore";
import { sortMembers } from "@/domain/members";
import type { Expense, Member, Trip } from "@/domain/types";
import { firebaseReady } from "./firebase";
import { useLive, type Live } from "./live";

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

/** TRIP-5, KI-1, KI-2: Home's single query, newest first. */
export function useMyTrips(uid: string): Live<Trip[]> {
  const live = useMyTripsQuery(uid);
  return useMemo(
    () =>
      live.status === "ready"
        ? { status: "ready", data: live.data.filter((trip) => lostTrips.get(trip.id) !== rawOf.get(trip)) }
        : live,
    [live],
  );
}

function useMyTripsQuery(uid: string): Live<Trip[]> {
  return useLive(`myTrips/${uid}`, (emit) =>
    listen(() =>
      FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference: "trips",
          compositeFilter: {
            type: "and",
            queryConstraints: [
              { type: "where", fieldPath: "memberUids", opStr: "array-contains", value: uid },
            ],
          },
        },
        (event, error) => {
          if (error || !event) return emit({ status: "gone" });
          const trips = event.snapshots
            .filter((s) => s.data)
            .map((s) => {
              const trip = toTrip(s.id, s.data!);
              rawOf.set(trip, JSON.stringify(s.data));
              return trip;
            });
          emit({ status: "ready", data: trips.sort((a, b) => b.createdAt - a.createdAt) });
        },
      ),
    ),
  );
}

export function useTrip(tripId: string): Live<Trip> {
  return useLive(`trip/${tripId}`, (emit) => {
    let last: string | null = null;
    return listen(() =>
      FirebaseFirestore.addDocumentSnapshotListener({ reference: `trips/${tripId}` }, (event, error) => {
        if (error || !event?.snapshot.data) {
          if (last) lostTrips.set(tripId, last);
          return emit({ status: "gone" });
        }
        last = JSON.stringify(event.snapshot.data);
        emit({ status: "ready", data: toTrip(tripId, event.snapshot.data) });
      }),
    );
  });
}

export function useExpenses(tripId: string): Live<Expense[]> {
  return useLive(`expenses/${tripId}`, (emit) =>
    listen(() =>
      FirebaseFirestore.addCollectionSnapshotListener(
        { reference: `trips/${tripId}/expenses` },
        (event, error) => {
          if (error || !event) return emit({ status: "gone" });
          const expenses = event.snapshots
            .filter((s) => s.data)
            .map((s) => ({ id: s.id, ...(s.data as Omit<Expense, "id">) }));
          emit({ status: "ready", data: expenses });
        },
      ),
    ),
  );
}
