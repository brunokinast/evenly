# Evenly

Trip expense splitting app, maintained entirely by Claude. The user doesn't write code: follow the process on your own and keep answers short.

## Where things are
- `specs/`: source of truth for behavior (acceptance criteria like `TRIP-3`) and `specs/design.md` for visuals.
- `docs/architecture.md`: folders, layers, the live-data pattern. `docs/data-model.md`: Firestore schema and rules design.
- `docs/decisions/`: ADRs (append-only; a changed decision gets a new ADR). Read `0001` before proposing any technology.
- `docs/rebuild-plan.md`: phases and current status.

## Clean room
This is a clean-room rebuild. Never read, search or reference the old app (`../evenly` or any copy of it), even if asked to "check how it worked". Everything needed is in `specs/`. If a spec is unclear, ask the user; don't guess from memory of the old app. `specs/migration-source.md` is for the migration script only.

## Rules
- Spec first: a behavior change updates the spec (and gets the user's OK) before code; spec and code change in the same commit. Tests name the AC IDs they cover.
- Only `src/data/` imports Firebase. `src/domain/` is pure TypeScript.
- Everything on screen is live: data comes from the shared listener hooks in `src/data/`. No one-off reads for on-screen data, no manual caches, no writing to local state after a write.
- Every write is one document or one batched write that the Security Rules validate. No Cloud Functions, no transactions.
- Money is integer cents; times are integer ms. Format with `Intl`, never by hand.
- Follow `specs/design.md` tokens; no literal colors.
- Previews go on a local LAN server for the user's phone, never published to claude.ai.
