# Relinking a person's trips

A person who ends up with a new identity keeps no trips: it happens after reinstalling the app or clearing its data, or when moving between the browser, the Android app and the iPhone Home Screen app (ID-10). `scripts/relink.ts` moves their trips from the old identity to the new one: in every trip of the old identity, their member entry, the ownership and their expenses' `createdBy` switch to the new identity, one batch per trip. Their name comes from the new identity (the old one if it has none).

## Steps

The real project only with the user's OK. Needs `npx firebase login` once (no key file).

1. The person opens Evenly where they'll use it from now on and enters their name: that creates the new identity.
2. `npx tsx scripts/relink.ts --users` lists the 30 newest identities: creation time, uid, name. The new one is the newest with their name; the old one is an older entry with the same name (or the `uid` of their member entry in a trip, in the Firebase console). Confirm the pair with the user.
3. `npx tsx scripts/relink.ts <oldUid>=<newUid>` (several pairs allowed) is a dry run: it lists each trip and how many expenses change, and writes nothing.
4. The same with `--apply` writes. The trips show up for the person at once (live).

`--emulator` runs it against the local emulators (the LAN preview's `demo-evenly` data) to try it out.

## When it refuses

Nothing is written if any trip has a problem:

- **The new identity is already a member** (the person rejoined with a code): ask the user. Usually the fix is to remove the new member from that trip in the app first (as owner), then relink.
- **The old identity isn't a member**: wrong uid.
- **Too many expenses for one batch** (over 499 by that person in one trip): not supported; split the work by hand.

The old identity stays in Firebase Auth with no trips; that's harmless.
