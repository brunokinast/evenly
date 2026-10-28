# Invites and joining

## Description

The owner invites friends with a short-lived 6-digit code, created on demand. Friends type or paste it to join.

## Flows

1. **Invite** (owner only): tap "Invite" on the trip → a fresh code is shown with a countdown (valid 1 hour), plus Copy and Share. Share opens the system share sheet with: `Join my trip "<name>" on Evenly! Use invite code: <code>`. Tapping "Invite" again while a code is valid shows the same code, with an option to generate a new one.
2. **Join**: from Home → "Join trip" → enter or paste the code → preview of the trip (name, icon, currency) → if the trip has guests, optionally "Are you one of these?" (see MEM-7) → "Join" → the user lands in the trip.
3. **Already a member**: the preview says "You're already a member of <trip>" and offers "Open trip".

## Acceptance criteria

- **INV-1** A code is exactly 6 digits and unique among currently valid codes.
- **INV-2** A code exists only after the owner taps "Invite" and is valid for **1 hour**. A trip has at most one valid code at a time.
- **INV-3** The join screen opens with the keyboard up, accepts only digits (max 6) and submits automatically at 6 digits. Paste extracts the first 6 digits from the clipboard text. Once a valid code is found, the keyboard closes so the trip preview and the Join button are in view.
- **INV-4** Given an invalid, expired or replaced code, then the user sees "Invalid or expired invite code" and can enter a different one.
- **INV-5** A non-member can see only the preview fields (name, icon, currency) and the guest names of a trip whose valid code they entered. Nothing else.
- **INV-6** Given a user joins, then the trip appears on their Home **immediately**, with no refresh or restart, and they appear live in the member list of every other member.
- **INV-7** Joining is idempotent: tapping Join twice or joining an already-joined trip never creates a duplicate member.
- **INV-8** Given the owner generates a new code, then the previous code fails INV-4 immediately.
- **INV-9** Code guessing is limited: a user gets a limited number of failed attempts per time window.
- **INV-10** Only the owner can create codes.
- **INV-11** A user who left or was removed can rejoin with a new valid code. Their former place is now a guest (MEM-5), so they can claim it back (MEM-7) with its expenses, or join as a new member.
- **INV-12** No shareable join links; code only.
