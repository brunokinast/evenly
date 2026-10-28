import { NAME_MAX } from "./names";
import { isGuest, type Member, type Trip } from "./types";

/** MEM-6: join order, owner first (the owner joined first). */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
}

export type Person = {
  id: string;
  /** Name with a MEM-4 suffix when another member shows the same name: "Ana (2)". */
  name: string;
  me: boolean;
  guest: boolean;
  owner: boolean;
  /** In an expense but no longer in the trip (data-model race); shown as "Former member". */
  former: boolean;
};

/**
 * KI-11, MEM-4: every member's display name, computed in one place. Duplicate names are told apart by the
 * "You" label for the current user and a number suffix for the others, in join order.
 */
export function people(trip: Trip, myUid: string): Map<string, Person> {
  const out = new Map<string, Person>();
  const seen = new Map<string, number>();
  for (const m of trip.members) {
    const me = m.uid === myUid;
    const key = m.name.toLocaleLowerCase();
    let name = m.name;
    if (!me) {
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if (n > 1) name = `${m.name} (${n})`;
    }
    out.set(m.id, { id: m.id, name, me, guest: isGuest(m), owner: m.uid === trip.ownerUid, former: false });
  }
  return out;
}

/** A person by id, falling back to a "former member" entry for ids that left the trip. */
export function person(map: Map<string, Person>, id: string, formerName: string): Person {
  return map.get(id) ?? { id, name: formerName, me: false, guest: true, owner: false, former: true };
}

export type GuestNameCheck = { ok: true; name: string } | { ok: false; error: "empty" | "tooLong" | "taken" };

/** MEM-2: trimmed, required, unique among the trip's guests (case-insensitive). */
export function checkGuestName(raw: string, members: Member[]): GuestNameCheck {
  const name = raw.trim();
  if (!name) return { ok: false, error: "empty" };
  if ([...name].length > NAME_MAX) return { ok: false, error: "tooLong" };
  const key = name.toLocaleLowerCase();
  if (members.some((m) => isGuest(m) && m.name.toLocaleLowerCase() === key))
    return { ok: false, error: "taken" };
  return { ok: true, name };
}

export type TripNameCheck = { ok: true; name: string } | { ok: false; error: "empty" | "tooLong" };

/** TRIP-2: trimmed, required; at most 50 characters (APP-8). */
export function checkTripName(raw: string): TripNameCheck {
  const name = raw.trim();
  if (!name) return { ok: false, error: "empty" };
  if ([...name].length > NAME_MAX) return { ok: false, error: "tooLong" };
  return { ok: true, name };
}
