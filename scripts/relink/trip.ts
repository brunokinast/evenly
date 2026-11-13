// What a relink changes in one trip (docs/data-model.md has the trip document's shape).

export type TripDoc = {
  name: string;
  ownerUid: string;
  members: Record<string, { name: string; uid?: string; joinedAt: number }>;
  memberIdsByUid: Record<string, string>;
  memberUids: string[];
};

/**
 * The old uid's member entry, ownership and expenses' `createdBy` move to the user's new
 * identity. Returns the trip fields to write and the expense ids whose `createdBy` changes.
 */
export function relinkTrip(
  trip: TripDoc,
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
