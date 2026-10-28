# Old data shape (migration only)

> Reference for the migration script **only**. Not a design reference. The new model is designed in `docs/data-model.md`.

Firebase project: `evenly-app-6f5f2`. Auth: anonymous only. Android applicationId: `br.com.kinast.evenly` (release keystore referenced by `android/key.properties` in the old repo; it exists locally).

```
users/{uid}
  displayName: string
  createdAt: timestamp

trips/{tripId}
  title: string
  currency: "BRL" | "USD" | "EUR" | "GBP"
  ownerUid: string
  iconName: string            # optional, default "luggage"
  inviteCode: string          # 6 digits
  inviteCodeActive: bool
  inviteCodeCreatedAt: timestamp
  inviteCodeExpiresAt: timestamp | null
  createdAt: timestamp
  updatedAt: timestamp        # optional; written only to trigger list refresh

trips/{tripId}/members/{memberId}
  uid: string                 # present for app users
  manualName: string          # present for guests
  createdAt: timestamp

trips/{tripId}/expenses/{expenseId}
  amount_cents: int
  description: string
  payer_member_id: string     # -> members/{memberId}
  participant_member_ids: string[]
  createdByUid: string
  createdAt: timestamp
```

Notes:
- The owner is also a member document (with `uid == ownerUid`).
- Member IDs are referenced by expenses; the migration must preserve or remap them.
- Some members may have neither `uid` nor `manualName` (shown as "Unknown").
