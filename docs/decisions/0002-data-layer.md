# 0002: Data layer

Status: accepted (2026-10-27).

## Decisions

1. **Only `src/data/` touches Firebase.** Screens, components and domain logic never import Firebase. Enforced by ESLint.
2. **Firebase goes through the Capacitor Firebase plugins on every platform** (`@capacitor-firebase/authentication`, `@capacitor-firebase/firestore`): native SDKs on Android, the JS SDK on the web.
3. **No transactions.** Every write is one document or one batched write, validated by Security Rules.
4. **Clean structure** (user preference): the model is designed for the specs and for speed. Collections: `trips`, `invites`, `joinAttempts`.
5. **Display name in the Auth profile**, copied into each shared trip; no user profile collection.

## Why

- (2) Native Android code must be able to act as the signed-in user, which needs native auth. The WebView's JS SDK can't share a native anonymous session, so Firestore has to run natively too, as the same user. Using the same plugin API on the web keeps one data layer.
- (3) The Firestore plugin offers listeners, queries, batched writes and FieldValues, but no transactions. Batches + rules cover every spec operation.
- (5) No extra read at startup; the name is private except inside shared trips (ID-7).

## Consequences

- The rules can't loop over maps, so a few checks are client-only (listed in `docs/data-model.md`).
