# Invites and joining

## Description
Each trip has a 6-digit invite code. Friends type or paste it to join. The owner can share it, and generate a new one if it leaks.

## Flows
1. **Share** (owner): the trip shows the code, how long until it expires, a Copy button and a Share button. Share opens the system share sheet with: `Join my trip "<name>" on Evenly! Use invite code: <code>`.
2. **Join**: from Home → "Join trip", enter or paste the code → the app shows a preview of the trip (name, icon, currency) → "Join" → the user lands in the trip.
3. **Already a member**: the preview says "You're already a member of <trip>" and offers "Open trip".
4. **Regenerate** (owner): after confirming, a new code replaces the old one, which stops working immediately.

## Acceptance criteria
- **INV-1** A code is exactly 6 digits and unique among currently valid codes.
- **INV-2** A code is valid for 7 days from when it was generated (see OQ-5).
- **INV-3** The join screen accepts only digits, max 6. Paste extracts the first 6 digits from the clipboard text.
- **INV-4** Given an invalid, expired or replaced code, then the user sees "Invalid or expired invite code" and can enter a different one.
- **INV-5** A non-member can see only the preview fields (name, icon, currency) of a trip whose valid code they entered. Nothing else.
- **INV-6** Given a user joins, then the trip appears on their Home **immediately**, with no refresh or restart, and they appear live in the member list of every other member.
- **INV-7** Joining is idempotent: tapping Join twice or joining an already-joined trip never creates a duplicate member.
- **INV-8** Given the owner regenerates the code, then the old code fails INV-4 and the new code works.
- **INV-9** Codes can't be guessed by enumeration in practice (see OQ-6).
- **INV-10** Opening a link like `/join/123456` pre-fills the code and goes straight to the preview (see OQ-7).
