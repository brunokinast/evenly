// Phase 6: old Firestore shape (specs/migration-source.md) → new model (docs/data-model.md "Migration").
// Pure functions over a backup tree; scripts/migrate.ts does the reading and writing.
import { balances } from "../../src/domain/balances";
import { NAME_MAX } from "../../src/domain/names";
import { equalShares } from "../../src/domain/split";
import { CURRENCIES, TRIP_ICONS, type Currency, type Expense, type TripIcon } from "../../src/domain/types";

/** A Firestore value in JSON. Non-JSON types are tagged so a backup can be restored exactly. */
export type Value =
  | null
  | boolean
  | number
  | string
  | Value[]
  | { [key: string]: Value }
  | { __type: "timestamp"; ms: number }
  | { __type: "ref"; path: string }
  | { __type: "geo"; lat: number; lng: number }
  | { __type: "bytes"; base64: string };

export type DocNode = {
  /** null: the document doesn't exist, only its subcollections do. */
  data: Record<string, Value> | null;
  collections: Record<string, Collection>;
};
export type Collection = Record<string, DocNode>;
export type Backup = { projectId: string; takenAt: number; collections: Record<string, Collection> };

export type NewMember = { name: string; uid?: string; joinedAt: number };
export type NewTrip = {
  name: string;
  icon: TripIcon;
  currency: Currency;
  ownerUid: string;
  createdAt: number;
  members: Record<string, NewMember>;
  memberIdsByUid: Record<string, string>;
  memberUids: string[];
  invite: null;
};
export type NewExpense = Omit<Expense, "id">;

export type KeptTrip = {
  id: string;
  trip: NewTrip;
  expenses: Record<string, NewExpense>;
  /** Old documents under the trip that the new model doesn't have (members, unknown subcollections). */
  leftovers: string[];
  /** Per member: old balance (paid − amount / participants, exact) and the new one in cents. */
  check: { memberId: string; name: string; old: number; new: number; ok: boolean }[];
};
export type Plan = {
  keep: KeptTrip[];
  drop: { id: string; name: string; reason: string }[];
  /** Trips already in the new shape (a re-run, or new trips): left alone. */
  alreadyNew: string[];
  /** Root collections other than trips/users: left alone, listed for the user. */
  otherCollections: string[];
  warnings: string[];
};

const MAX_DESCRIPTION = 100; // EXP-1
export const UNKNOWN = "Unknown";

export function toMs(v: Value | undefined): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return Date.parse(v);
  if (v && typeof v === "object" && !Array.isArray(v) && v.__type === "timestamp") return v.ms as number;
  return undefined;
}

const str = (v: Value | undefined) => (typeof v === "string" ? v.trim() : "");

/** Trims and cuts to `max` characters (whole code points), with a warning when it had to cut. */
function fit(text: string, max: number, what: string, warn: (w: string) => void): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  warn(`${what} cut to ${max} characters: "${text}"`);
  return chars.slice(0, max).join("").trim();
}

export function planMigration(backup: Backup): Plan {
  const plan: Plan = { keep: [], drop: [], alreadyNew: [], otherCollections: [], warnings: [] };
  const users = backup.collections.users ?? {};
  plan.otherCollections = Object.keys(backup.collections).filter((c) => c !== "trips" && c !== "users");

  for (const [tripId, node] of Object.entries(backup.collections.trips ?? {})) {
    const warn = (w: string) => plan.warnings.push(`trip ${tripId}: ${w}`);
    const old = node.data;
    const expenseDocs = Object.entries(node.collections.expenses ?? {}).filter(([, e]) => e.data);
    const title = str(old?.title);
    if (old && Array.isArray(old.memberUids)) {
      plan.alreadyNew.push(tripId);
      continue;
    }
    if (!old) {
      plan.drop.push({ id: tripId, name: "", reason: "no trip document (only leftovers)" });
      continue;
    }
    if (expenseDocs.length === 0) {
      plan.drop.push({ id: tripId, name: title, reason: "no expenses" });
      continue;
    }
    const currency = CURRENCIES.find((c) => c === old.currency);
    const ownerUid = str(old.ownerUid);
    if (!currency || !ownerUid) {
      plan.drop.push({
        id: tripId,
        name: title,
        reason: `invalid currency or owner (${String(old.currency)})`,
      });
      warn("NOT migrated: invalid currency or owner");
      continue;
    }
    const createdAt = toMs(old.createdAt) ?? toMs(old.updatedAt) ?? backup.takenAt;
    if (toMs(old.createdAt) === undefined) warn("no createdAt; used updatedAt or the backup time");
    const iconName = str(old.iconName) || "luggage";
    const icon = TRIP_ICONS.find((i) => i === iconName) ?? "luggage";
    if (icon !== iconName) warn(`icon "${iconName}" isn't one of the new icons; using luggage`);

    // Members: same ids. Old app users keep their old uid until scripts/relink.ts.
    const members: Record<string, NewMember> = {};
    const memberIdsByUid: Record<string, string> = {};
    for (const [id, m] of Object.entries(node.collections.members ?? {})) {
      if (!m.data) continue;
      const uid = str(m.data.uid);
      const joinedAt = toMs(m.data.createdAt) ?? createdAt;
      if (uid && memberIdsByUid[uid]) {
        warn(`uid ${uid} is on two members (${memberIdsByUid[uid]}, ${id}); ${id} becomes a guest`);
      }
      if (uid && !memberIdsByUid[uid]) {
        const name = str(users[uid]?.data?.displayName);
        if (!name) warn(`user ${uid} has no name; named "${UNKNOWN}"`);
        members[id] = { name: fit(name || UNKNOWN, NAME_MAX, `name of ${uid}`, warn), uid, joinedAt };
        memberIdsByUid[uid] = id;
      } else {
        const name = str(m.data.manualName) || str(users[uid]?.data?.displayName);
        if (!name) warn(`member ${id} has no name; named "${UNKNOWN}"`);
        members[id] = { name: fit(name || UNKNOWN, NAME_MAX, `guest ${id}`, warn), joinedAt };
      }
    }
    if (!memberIdsByUid[ownerUid]) {
      // The invariant (ownerUid ∈ memberUids) needs the owner as a member; they joined first.
      const id = `owner-${ownerUid}`;
      warn(`owner ${ownerUid} has no member document; added as member ${id}`);
      members[id] = {
        name: fit(str(users[ownerUid]?.data?.displayName) || UNKNOWN, NAME_MAX, "owner name", warn),
        uid: ownerUid,
        joinedAt: createdAt,
      };
      memberIdsByUid[ownerUid] = id;
    }

    // Expenses reference member ids that may be gone; they come back as guests so every expense stays
    // editable (the rules want payer and participants to be members).
    const missing = new Set<string>();
    for (const [, e] of expenseDocs) {
      const ids = [e.data!.payer_member_id, ...(asArray(e.data!.participant_member_ids) ?? [])];
      for (const id of ids) if (typeof id === "string" && id && !members[id]) missing.add(id);
    }
    for (const id of missing) {
      warn(`member ${id} is in expenses but has no member document; added as guest "${UNKNOWN}"`);
      members[id] = { name: UNKNOWN, joinedAt: createdAt };
    }

    const order = Object.entries(members)
      .sort(([a, x], [b, y]) => x.joinedAt - y.joinedAt || a.localeCompare(b))
      .map(([id]) => id);
    const expenses: Record<string, NewExpense> = {};
    const oldBalance = new Map<string, number>(order.map((id) => [id, 0]));
    const addOld = (id: string, v: number) => oldBalance.set(id, (oldBalance.get(id) ?? 0) + v);
    const slack = new Map<string, number>(); // largest possible rounding gap per member, in cents

    for (const [id, e] of expenseDocs) {
      const d = e.data!;
      const amountCents = d.amount_cents;
      const payerId = str(d.payer_member_id);
      const participants = [...new Set((asArray(d.participant_member_ids) ?? []).filter(isNonEmptyString))];
      if (typeof amountCents !== "number" || !Number.isInteger(amountCents) || amountCents <= 0 || !payerId) {
        warn(`expense ${id} has an invalid amount or payer; NOT migrated (${JSON.stringify(d)})`);
        continue;
      }
      if (participants.length === 0) {
        warn(`expense ${id} has no participants; NOT migrated (${JSON.stringify(d)})`);
        continue;
      }
      const at = toMs(d.createdAt) ?? createdAt;
      const description = str(d.description) || "—";
      if (!str(d.description)) warn(`expense ${id} has no description; using "—"`);
      expenses[id] = {
        description: fit(description, MAX_DESCRIPTION, `expense ${id} description`, warn),
        amountCents,
        payerId,
        shares: equalShares(
          amountCents,
          order.filter((m) => participants.includes(m)),
          payerId,
        ),
        split: "equal",
        spentAt: at,
        createdBy: str(d.createdByUid) || ownerUid,
        createdAt: at,
        updatedAt: at,
      };
      addOld(payerId, amountCents);
      for (const p of participants) {
        addOld(p, -amountCents / participants.length);
        // Each share is at most one leftover cent per participant away from the exact amount / n.
        slack.set(p, (slack.get(p) ?? 0) + participants.length);
      }
    }
    if (Object.keys(expenses).length === 0) {
      plan.drop.push({ id: tripId, name: title, reason: "no valid expenses" });
      continue;
    }

    const newBalance = balances(
      order,
      Object.entries(expenses).map(([eid, e]) => ({ id: eid, ...e })),
    );
    const check = order.map((m) => {
      const o = oldBalance.get(m) ?? 0;
      const n = newBalance.get(m) ?? 0;
      return {
        memberId: m,
        name: members[m]!.name,
        old: o,
        new: n,
        ok: Math.abs(o - n) < (slack.get(m) ?? 0) + 1e-6,
      };
    });
    const sum = [...newBalance.values()].reduce((a, b) => a + b, 0);
    if (sum !== 0) warn(`new balances sum to ${sum}, not 0`);
    if (!title) warn(`no title; named "Trip"`);

    const leftovers = Object.entries(node.collections).flatMap(([c, docs]) =>
      c === "expenses"
        ? Object.keys(docs)
            .filter((eid) => !expenses[eid])
            .map((eid) => `expenses/${eid}`)
        : Object.keys(docs).map((d) => `${c}/${d}`),
    );
    for (const c of Object.keys(node.collections)) {
      if (c !== "members" && c !== "expenses") warn(`unknown subcollection "${c}" will be deleted`);
    }

    plan.keep.push({
      id: tripId,
      trip: {
        name: fit(title || "Trip", NAME_MAX, "title", warn),
        icon,
        currency,
        ownerUid,
        createdAt,
        members,
        memberIdsByUid,
        memberUids: Object.keys(memberIdsByUid),
        invite: null,
      },
      expenses,
      leftovers,
      check,
    });
  }
  return plan;
}

function asArray(v: Value | undefined): Value[] | undefined {
  return Array.isArray(v) ? v : undefined;
}
const isNonEmptyString = (v: Value): v is string => typeof v === "string" && v.length > 0;

/**
 * Phase 6 last step: the old uid's member entry, ownership and expenses' `createdBy` move to the user's new
 * identity. Returns the trip fields to write and the expense ids whose `createdBy` changes.
 */
export function relinkTrip(
  trip: Pick<NewTrip, "ownerUid" | "members" | "memberIdsByUid" | "memberUids">,
  expenses: Record<string, { createdBy: string }>,
  oldUid: string,
  newUid: string,
  newName: string | undefined,
) {
  const memberId = trip.memberIdsByUid[oldUid];
  if (!memberId || !trip.members[memberId]) throw new Error(`${oldUid} isn't a member`);
  if (trip.memberUids.includes(newUid) || trip.memberIdsByUid[newUid]) {
    throw new Error(`${newUid} is already a member`);
  }
  const others = Object.fromEntries(Object.entries(trip.memberIdsByUid).filter(([u]) => u !== oldUid));
  const member = trip.members[memberId]!;
  return {
    update: {
      ownerUid: trip.ownerUid === oldUid ? newUid : trip.ownerUid,
      members: {
        ...trip.members,
        [memberId]: { ...member, uid: newUid, name: newName?.trim() || member.name },
      },
      memberIdsByUid: { ...others, [newUid]: memberId },
      memberUids: trip.memberUids.map((u) => (u === oldUid ? newUid : u)),
    },
    expenseIds: Object.entries(expenses)
      .filter(([, e]) => e.createdBy === oldUid)
      .map(([id]) => id),
  };
}
