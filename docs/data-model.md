# Data model

Firestore schema and Security Rules design. Designed from `specs/` only. Written so a reader with no context (including future Kotlin code) can use it.

## Principles

- **Small trips, few documents.** A trip is one document holding its members. Expenses are a subcollection. A trip screen = 2 live listeners; Home = 1 live query (KI-1, KI-2).
- **Rules are the backend.** No Cloud Functions. Every write is a single document write or one atomic batched write, and the rules validate it. No transactions (the Capacitor Firestore plugin doesn't offer them, see ADR 0002).
- **Plain JSON types.** Times are **integer milliseconds since epoch** (UTC), money is **integer cents**, IDs are strings. No Firestore `Timestamp`, no references. Easy to read and write from TypeScript, Kotlin and the rules.
- **Clean structure over old-app compatibility** (user preference). The old app's documents don't match these shapes, so the rules lock the old app out and the queries never return its data. Migrating old data is optional (see the end).

## Collections

```
trips/{tripId}
trips/{tripId}/expenses/{expenseId}
invites/{code}
joinAttempts/{uid}
```

There is no user profile collection. The display name lives in the Firebase Auth profile (`displayName`), which is private to the user, cached on the device and available to native code. Other people see it only as a copy inside the trips they share (ID-7).

### `trips/{tripId}`

| Field            | Type                                                              | Notes                                                                                                   |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `name`           | string, 1–50 chars, trimmed                                       | TRIP-2, owner can change (TRIP-11)                                                                      |
| `icon`           | one of the 16 TRIP-4 ids                                          | fixed after creation (no spec to change it)                                                             |
| `currency`       | `"BRL" \| "USD" \| "EUR" \| "GBP"`                                | immutable (TRIP-3)                                                                                      |
| `ownerUid`       | string                                                            | immutable                                                                                               |
| `createdAt`      | int ms                                                            | immutable; Home sorts by it, newest first                                                               |
| `members`        | map memberId → `{ name: string, uid?: string, joinedAt: int ms }` | `uid` present = app user, absent = guest                                                                |
| `memberIdsByUid` | map uid → memberId                                                | which member entry belongs to which user                                                                |
| `memberUids`     | array of uid                                                      | same uids as `memberIdsByUid` keys; exists for the Home query (`array-contains`) and cheap rule checks  |
| `invite`         | `{ code: string, expiresAt: int ms }` or `null`                   | the current code (INV-2); written by the owner only                                                     |
| `editedMember`   | memberId (optional)                                               | the one member entry the owner's last write changed; only for the rules (they can't loop over map keys) |

- **memberId** is an opaque random ID. Expenses reference members by memberId, never by uid. So claiming a guest (MEM-7) is just "attach a uid to the guest's entry", and leaving (MEM-5) is "detach the uid": the entry becomes a guest with the same name. No expense ever changes.
- `members[m].name` is the guest's name, or for app users a **copy** of their Auth display name. Renaming updates every copy with one write per trip, so one trip the user lost access to can't block the others (ID-5).
- Member order = `joinedAt` ascending; the owner joined first. Screens show the current user first, then this order (MEM-6); computations (BAL-2) use this order as stored. A claimed guest keeps its original `joinedAt`.
- Invariant (rule-checked on every write): `memberUids` as a set == keys of `memberIdsByUid`, and `ownerUid` is in it.

### `trips/{tripId}/expenses/{expenseId}`

| Field                    | Type                           | Notes                                                                    |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------ |
| `description`            | string, 1–100 chars, trimmed   | EXP-1                                                                    |
| `amountCents`            | int, 1 … 10¹⁰                  | EXP-1                                                                    |
| `payerId`                | memberId                       | must be a current member (EXP-5, EXP-6)                                  |
| `shares`                 | map memberId → int cents (> 0) | participants = its keys; values sum to `amountCents` (BAL-2, EXP-12)     |
| `split`                  | `"equal" \| "custom"`          | how the shares were made; drives the form and the "Custom split" caption |
| `spentAt`                | int ms                         | date and time (EXP-11); not in the future                                |
| `createdBy`              | uid                            |                                                                          |
| `createdAt`, `updatedAt` | int ms                         |                                                                          |

- Shares are **computed once, at save**, by `src/domain/` (BAL-2 leftover rule uses member order at that moment) and stored. Balances are then a plain sum. Later member changes never re-split old expenses.
- "Split between all" is shown when the share keys equal the current member ids.

### `invites/{code}`

The lookup from a 6-digit code to a trip, plus the preview a non-member may see (INV-5).

| Field                      | Type                                        |
| -------------------------- | ------------------------------------------- |
| `tripId`                   | string                                      |
| `expiresAt`                | int ms (created + 1 h)                      |
| `name`, `icon`, `currency` | copies from the trip                        |
| `guests`                   | map memberId → name (unclaimed guests only) |

Copies are kept in sync by the writes that change them: the owner's rename / add guest / remove member batches also update the valid invite, a join that claims a guest removes it from `guests`, and a member who leaves adds their new guest entry, each in the same batch.

### `joinAttempts/{uid}`

Rate limit for code guessing (INV-9): `{ code: string, count: int, windowStart: int ms }`. To read an invite, the user must first write the code here. The rules let `count` grow by exactly 1 per write and allow **10 attempts per 15 minutes**, so every guess costs a counted write.

## Operations

Each is one write or one batch, in `src/data/`. "Batch" = Firestore batched write (atomic, ≤ 500 operations).

| Operation                                | Writes                                                                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Set name (ID-1..3, ID-5)                 | Auth `updateProfile`; then one write per trip updating `members[myId].name` (each is its own single-document write)                                                                                                            |
| Create trip (TRIP-1)                     | set `trips/{new}` with me as the owner and only member                                                                                                                                                                         |
| Rename trip (TRIP-11)                    | batch: trip `name` + valid invite `name`                                                                                                                                                                                       |
| Delete trip (TRIP-7, KI-5)               | batch: delete all expenses, the invite (only if still valid; an expired code may already belong to another trip), the trip. Over 499 docs: delete expenses in chunks and the trip in the last batch, so a retry resumes safely |
| Create invite (INV-1, 2, 8, 10)          | batch: set `invites/{random code}`, delete the previous `invites/{old}` (only if still valid), set trip `invite`. If the code is taken (write denied), retry with a new code (max 3)                                           |
| Look up code (INV-3, 4)                  | set `joinAttempts/{me}`, then get `invites/{code}`; missing or expired → INV-4                                                                                                                                                 |
| Join (INV-6, 7, MEM-7)                   | batch: update trip (add my uid to `memberUids` and `memberIdsByUid`; add a new member entry, or put my uid and name on the claimed guest); if claiming, remove the guest from `invites/{code}.guests`                          |
| Add guest (MEM-1)                        | batch: add member entry without uid + add to invite `guests`                                                                                                                                                                   |
| Leave / remove an app user (MEM-5, 8, 9) | batch: remove the uid from `memberUids` and `memberIdsByUid` and delete `uid` from the member entry, which is now a guest; add it to the valid invite's `guests`                                                               |
| Remove a guest (MEM-5)                   | batch: delete the member entry (only if in no expense) + remove from invite `guests`                                                                                                                                           |
| Add / edit / delete expense (EXP-3, 4)   | one expense document write                                                                                                                                                                                                     |

Already a member (INV-7): the client knows from its live Home list; the rules also reject a join from a current member.

## Security Rules design

Helpers: `signedIn()`, `tripAt(id)` = `get(/trips/id).data` (`tripAfter(id)` = the same after the batch, `getAfter`), `isMember(t)` = `request.auth.uid in t.memberUids`, `now()` = `request.time.toMillis()`. Field allow-lists use `diff(...).affectedKeys().hasOnly([...])`. Everything not listed is denied.

**trips/{tripId}**

- read: member (TRIP-8). A removed member's listener fails immediately (MEM-9).
- create: `ownerUid == me`, `memberUids == [me]`, one member entry with `uid == me`, `invite == null`, valid name/icon/currency.
- delete: owner.
- update, exactly one of these cases:
  1. **Owner edit**: only `name`, `members`, `memberUids`, `memberIdsByUid`, `invite`, `editedMember` change; owner stays a member; invariant holds; the invite expires within about an hour. Members: either no entry changes (and `memberUids` / `memberIdsByUid` don't either), or exactly the entry named in `editedMember` changes, in one of three ways: a new guest (`{name 2–50, joinedAt ≈ now}`), a guest deleted, or an app user made a guest (only their `uid` leaves the entry, `memberUids` and `memberIdsByUid`). The owner never renames anyone or attaches a uid.
  2. **Rename self**: a member changes only `members[memberIdsByUid[me]].name`.
  3. **Leave**: a non-owner member removes exactly their own uid from `memberUids` / `memberIdsByUid` and the `uid` field from their own member entry (name and `joinedAt` stay); nothing else.
  4. **Join**: a non-member; `get(joinAttempts/me).code == invite.code` and `invite.expiresAt > now()`; adds exactly `me` to `memberUids` and `memberIdsByUid`; the target member entry is either new (`{name, uid: me, joinedAt}`) or an existing guest (no `uid`) that only gains `uid: me` and a `name`; nothing else changes.

**trips/{tripId}/expenses/{expenseId}**

- read, delete: member of the trip.
- create, update: member; field allow-list; `description`, `amountCents`, `split`, `spentAt <= now() + 10 min` valid; `payerId in trip.members`; `shares` non-empty and `shares.keys().hasOnly(trip.members.keys())`; `createdBy`/`createdAt` unchanged on update.

**invites/{code}**

- get: `get(joinAttempts/me).code == code` (no `list`, so codes can't be enumerated).
- create / update (reusing an expired code): the trip's owner, and `getAfter(trip).invite.code == code`, `expiresAt` = about now + 1 h (±10 min), and name/icon/currency equal the trip's. Update of a still-valid invite by the owner for synced fields; by a joiner only to remove the guest they just claimed, and by a leaver only to add their own new guest entry (both checked with `getAfter`).
- delete: the trip's owner.

**joinAttempts/{uid}**

- read/write: only `uid == me`. Same window (`now() < windowStart + 15 min`): `count` + 1, max 10, `windowStart` unchanged. New window: `count == 1`, `windowStart` within 10 min of `now()`.

### Client clocks

Times are written by the client (no server timestamps, so Kotlin and the web write the same plain ints). The rules accept times up to **10 minutes** off the server clock (`near()`), so a phone with a slightly wrong clock can still write.

### What the rules can't check (enforced in the client and domain code)

Rules can't loop over a map, so these are client-side only. The UI, domain tests and display code handle them:

- Shares sum to `amountCents` and are all > 0 (BAL-2, EXP-12). The balance code uses shares as stored.
- Guest name uniqueness (MEM-2).
- A guest in an expense can't be removed (MEM-5). If it ever happens (a race), display code shows that memberId as "Former member" and balances still sum to zero.
- New anonymous accounts get fresh guess budgets (INV-9). Also, because client times may be 10 minutes off, a new window can start up to 10 minutes in the past, so the worst case is about 10 guesses per 5 minutes rather than per 15. Firebase limits anonymous sign-ups per IP; with 10⁶ codes, each valid 1 hour, guessing stays impractical.

## Reads and cost

Home: 1 query listener (my trips). Trip: trip doc + expenses listener. Rule `get()` calls count as reads once per request. With ~10-person groups, a month's use stays far under the Spark free limits (50k reads / 20k writes per day).

## Migration (Phase 6)

Lower priority than a clean, fast model: the model is never bent to fit old data. A local Admin SDK script (`scripts/migrate.ts`, run with `npx tsx`; pure mapping in `scripts/migration/map.ts` with unit tests; see the Phase 6 handoff in `docs/rebuild-plan.md`) rewrites the old shape (`specs/migration-source.md`) in place, after saving a JSON backup of everything to disk, and then deletes the old leftovers (`trips/*/members`, `users`).

- Only trips with at least one expense are migrated (user's choice, 2026-10-28); the others are deleted with the leftovers and kept only in the backup.
- Old trip → `trips/{same tripId}` (whole document replaced): `title` → `name`, `iconName` → `icon` (default `luggage`), `currency`, `ownerUid`, `createdAt` → ms. `invite: null` (old codes aren't carried over).
- Old member docs → `members` entries with the **same memberIds**. `uid` → the same `uid` + name from `users/{uid}.displayName` (linked to the user's new identity later by `scripts/relink.ts`, which also takes the name from their new Auth profile; see the Phase 6 handoff); `manualName` → guest; neither → guest named "Unknown". `joinedAt` from `createdAt`.
- Old expense → same id: `amount_cents` → `amountCents`, `payer_member_id` → `payerId`, `participant_member_ids` → equal `shares` per BAL-2 (in member order), `split: "equal"`, `spentAt`/`createdAt`/`updatedAt` from `createdAt`, `createdByUid` → `createdBy`.
- Repairs (each printed as a warning in the dry run): an icon that isn't a TRIP-4 id → `luggage`; a member id used by an expense but with no member document → guest "Unknown" (the rules want payer and participants to be members); an owner with no member document → added as a member; an expense with no valid amount, payer or participants → not migrated (kept in the backup); names and descriptions cut to their maximum length.
- Trips already in the new shape (`memberUids` present) are left alone, so a re-run is safe.
- Check: per-trip balances, old (exact `amount / participants`) vs new (whole cents), must match within the rounding cents; after `--apply` the script reads everything back and compares again.
