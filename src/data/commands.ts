import { FieldValue, FirebaseFirestore, type WriteBatchOperation } from "@capacitor-firebase/firestore";
import { INVITE_TTL_MS, randomCode } from "@/domain/trips";
import type { Currency, Expense, Member, Split, Trip, TripIcon } from "@/domain/types";
import { isGuest } from "@/domain/types";
import { firebaseReady } from "./firebase";
import { myUid } from "./session";

// Writes (docs/data-model.md "Operations"). Each is one document write or one batch, validated by the rules.
// None of them update local state: the live listeners deliver the result, as for every other member.

/** Random document / member id (20 chars, like Firestore's own). */
export function newId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => chars[b % chars.length]).join("");
}

async function batch(operations: WriteBatchOperation[]) {
  await firebaseReady;
  await FirebaseFirestore.writeBatch({ operations });
}

const update = (reference: string, data: Record<string, unknown>): WriteBatchOperation => ({
  type: "update",
  reference,
  data,
});
const remove = (reference: string): WriteBatchOperation => ({ type: "delete", reference });

/** The trip's invite, if it's still valid (only then is its document certainly ours to update). */
function validInvite(trip: Trip) {
  return trip.invite && trip.invite.expiresAt > Date.now() ? trip.invite : null;
}

function myMemberId(trip: Trip) {
  return trip.memberIdsByUid[myUid()]!;
}

// ---------- trips ----------

/** TRIP-1: me as the owner and only member. Returns the new trip's id. */
export async function createTrip(input: {
  name: string;
  icon: TripIcon;
  currency: Currency;
  myName: string;
}) {
  await firebaseReady;
  const uid = myUid();
  const id = newId();
  const memberId = newId();
  const now = Date.now();
  await FirebaseFirestore.setDocument({
    reference: `trips/${id}`,
    data: {
      name: input.name,
      icon: input.icon,
      currency: input.currency,
      ownerUid: uid,
      createdAt: now,
      members: { [memberId]: { name: input.myName, uid, joinedAt: now } },
      memberIdsByUid: { [uid]: memberId },
      memberUids: [uid],
      invite: null,
    },
  });
  return id;
}

/** TRIP-11 (owner). */
export function renameTrip(trip: Trip, name: string) {
  const invite = validInvite(trip);
  return batch([
    update(`trips/${trip.id}`, { name }),
    ...(invite ? [update(`invites/${invite.code}`, { name })] : []),
  ]);
}

/** TRIP-7, KI-5 (owner): expenses in chunks, then the trip last, so a retry resumes safely. Reads the
 * expense ids itself (not the on-screen list, which hides malformed ones): once the trip is gone, no one
 * could delete a leftover expense. */
export async function deleteTrip(trip: Trip) {
  await firebaseReady;
  const { snapshots } = await FirebaseFirestore.getCollection({ reference: `trips/${trip.id}/expenses` });
  const ops = snapshots.map((s) => remove(`trips/${trip.id}/expenses/${s.id}`));
  while (ops.length > 450) await batch(ops.splice(0, 450));
  const invite = validInvite(trip);
  await batch([...ops, ...(invite ? [remove(`invites/${invite.code}`)] : []), remove(`trips/${trip.id}`)]);
}

/** ID-5: my name in the Auth profile is copied into each of my trips, one write per trip (so one trip
 * I lost access to can't block the others). */
export async function renameMeInTrips(trips: Trip[], name: string) {
  await firebaseReady;
  const writes = trips
    .filter((t) => t.members.find((m) => m.id === t.memberIdsByUid[myUid()])?.name !== name)
    .map((t) =>
      FirebaseFirestore.updateDocument({
        reference: `trips/${t.id}`,
        data: { [`members.${myMemberId(t)}.name`]: name },
      }),
    );
  const results = await Promise.allSettled(writes);
  if (results.some((r) => r.status === "rejected")) throw new Error("Some trips weren't updated");
}

// ---------- invites ----------

/** INV-1, INV-2, INV-8 (owner): a fresh code replaces the previous one. Retries if a code is taken. */
export async function createInvite(trip: Trip): Promise<string> {
  const guests = Object.fromEntries(trip.members.filter(isGuest).map((m) => [m.id, m.name]));
  const old = validInvite(trip);
  for (let attempt = 0; ; attempt++) {
    const code = randomCode((): number => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32);
    if (code === old?.code) continue;
    const expiresAt = Date.now() + INVITE_TTL_MS;
    try {
      await batch([
        {
          type: "set",
          reference: `invites/${code}`,
          data: {
            tripId: trip.id,
            expiresAt,
            name: trip.name,
            icon: trip.icon,
            currency: trip.currency,
            guests,
          },
        },
        ...(old ? [remove(`invites/${old.code}`)] : []),
        update(`trips/${trip.id}`, { invite: { code, expiresAt } }),
      ]);
      return code;
    } catch (e) {
      if (attempt >= 2) throw e; // A taken code is denied by the rules; try another.
    }
  }
}

export type InvitePreview = {
  code: string;
  tripId: string;
  name: string;
  icon: TripIcon;
  currency: Currency;
  guests: { id: string; name: string }[];
};

export class TooManyAttempts extends Error {}

/** Firestore's "denied by the rules" error: `permission-denied` on the web, `PERMISSION_DENIED` on Android. */
const isPermissionDenied = (e: unknown) =>
  /permission[-_ ]denied/i.test(`${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`);

/**
 * INV-3..5, INV-9: records the attempt (the rules count it), then reads the invite.
 * Returns null for an invalid, expired or replaced code.
 */
export async function lookupInvite(code: string): Promise<InvitePreview | null> {
  await firebaseReady;
  const ref = `joinAttempts/${myUid()}`;
  const { snapshot } = await FirebaseFirestore.getDocument<{ count: number; windowStart: number }>({
    reference: ref,
  });
  const prev = snapshot.data;
  const now = Date.now();
  const sameWindow = prev && now < prev.windowStart + 15 * 60_000;
  try {
    await FirebaseFirestore.setDocument({
      reference: ref,
      data: sameWindow
        ? { code, count: prev.count + 1, windowStart: prev.windowStart }
        : { code, count: 1, windowStart: now },
    });
  } catch (e) {
    // Only the rules' attempt limit means "too many"; a network error stays a plain error.
    throw isPermissionDenied(e) ? new TooManyAttempts() : e;
  }
  try {
    const invite = await FirebaseFirestore.getDocument<
      Omit<InvitePreview, "code" | "guests"> & {
        expiresAt: number;
        guests: Record<string, string>;
      }
    >({ reference: `invites/${code}` });
    const d = invite.snapshot.data;
    if (!d || d.expiresAt <= Date.now()) return null;
    const guests = Object.entries(d.guests).map(([id, name]) => ({ id, name }));
    return { code, tripId: d.tripId, name: d.name, icon: d.icon, currency: d.currency, guests };
  } catch {
    return null;
  }
}

/** INV-6, MEM-7: join as a new member, or take over guest `claimId`. */
export function joinTrip(invite: InvitePreview, myName: string, claimId: string | null) {
  const uid = myUid();
  const memberId = claimId ?? newId();
  const member = claimId
    ? { [`members.${claimId}.uid`]: uid, [`members.${claimId}.name`]: myName }
    : { [`members.${memberId}`]: { name: myName, uid, joinedAt: Date.now() } };
  return batch([
    update(`trips/${invite.tripId}`, {
      memberUids: FieldValue.arrayUnion(uid),
      [`memberIdsByUid.${uid}`]: memberId,
      ...member,
    }),
    ...(claimId ? [update(`invites/${invite.code}`, { [`guests.${claimId}`]: FieldValue.delete() })] : []),
  ]);
}

// ---------- members ----------

/** MEM-1 (owner). */
export function addGuest(trip: Trip, name: string) {
  const id = newId();
  const invite = validInvite(trip);
  return batch([
    update(`trips/${trip.id}`, { [`members.${id}`]: { name, joinedAt: Date.now() }, editedMember: id }),
    ...(invite ? [update(`invites/${invite.code}`, { [`guests.${id}`]: name })] : []),
  ]);
}

/** MEM-5: an app user who leaves or is removed becomes a guest with the same name. The owner's write
 * names the entry it changes (`editedMember`, for the rules); a leaver's write doesn't need to. */
function toGuest(trip: Trip, m: Member, byOwner: boolean) {
  const invite = validInvite(trip);
  return batch([
    update(`trips/${trip.id}`, {
      memberUids: FieldValue.arrayRemove(m.uid),
      [`memberIdsByUid.${m.uid}`]: FieldValue.delete(),
      [`members.${m.id}.uid`]: FieldValue.delete(),
      ...(byOwner ? { editedMember: m.id } : {}),
    }),
    ...(invite ? [update(`invites/${invite.code}`, { [`guests.${m.id}`]: m.name })] : []),
  ]);
}

/** MEM-5 (owner): an app user becomes a guest; a guest in no expense is deleted. */
export function removeMember(trip: Trip, m: Member) {
  if (!isGuest(m)) return toGuest(trip, m, true);
  const invite = validInvite(trip);
  return batch([
    update(`trips/${trip.id}`, { [`members.${m.id}`]: FieldValue.delete(), editedMember: m.id }),
    ...(invite ? [update(`invites/${invite.code}`, { [`guests.${m.id}`]: FieldValue.delete() })] : []),
  ]);
}

/** MEM-5, MEM-8, MEM-9: a non-owner leaves. */
export function leaveTrip(trip: Trip) {
  const me = trip.members.find((m) => m.id === myMemberId(trip))!;
  return toGuest(trip, me, false);
}

// ---------- expenses ----------

export type ExpenseInput = {
  description: string;
  amountCents: number;
  payerId: string;
  shares: Record<string, number>;
  split: Split;
  spentAt: number;
};

/** EXP-3, EXP-4: one document write. `existing` = edit. */
export async function saveExpense(tripId: string, input: ExpenseInput, existing?: Expense) {
  await firebaseReady;
  const now = Date.now();
  const id = existing?.id ?? newId();
  await FirebaseFirestore.setDocument({
    reference: `trips/${tripId}/expenses/${id}`,
    data: {
      ...input,
      spentAt: Math.min(input.spentAt, now), // EXP-11: never in the future
      createdBy: existing?.createdBy ?? myUid(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  });
}

export async function deleteExpense(tripId: string, expenseId: string) {
  await firebaseReady;
  await FirebaseFirestore.deleteDocument({ reference: `trips/${tripId}/expenses/${expenseId}` });
}
