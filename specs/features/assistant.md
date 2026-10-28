# Assistant (Gemini) — future

Status: **deferred** (Phase 7). Replaces the old Google Assistant voice command, which stopped working when Assistant was removed from Android (Sept 2026).

## Description
On Android, the user can ask Gemini things like "add 45 reais for dinner to my Lisbon trip, paid by Ana" and Gemini adds the expense through the app, without opening it.

## Acceptance criteria (draft)
- **AST-1** Inputs: amount (required), description (required), trip name (required if the user has more than one trip), payer name (optional, defaults to the user), participant names (optional, defaults to all members).
- **AST-2** Trip and member names are matched loosely (case, accents, partial). If several trips match, the most recent one is used; ambiguous people → Gemini asks the user to choose.
- **AST-3** When something can't be resolved, the app opens Add expense pre-filled with what was understood and a message explaining what's missing.
- **AST-4** After success, the user gets a confirmation (e.g. "Added R$ 45,00 for Dinner to Lisbon") with a way to open the trip.
- **AST-5** The same validation and permissions as manual entry apply (EXP-1, EXP-6).
