# Open questions

Each has a **proposed default**. Reply with the IDs you want changed; otherwise the default is used.

| ID | Question | Proposed default |
|---|---|---|
| OQ-1 | The old app has no way to change your name after the welcome screen (the text exists, the screen doesn't). Add it? | **Yes**, in a small Profile sheet on Home. |
| OQ-2 | Identity lives on one device. Losing the browser data or changing phone loses all trips. Offer optional "Sign in with Google" to keep trips across devices? | **Yes, optional**, linked to the current identity (no data loss), never required. |
| OQ-3 | Rename trip: text exists but no UI. Add it (owner only)? | **Yes**. |
| OQ-4 | Change a trip's currency after creation? | **No**: amounts would become meaningless. |
| OQ-5 | Codes expire after 7 days, so friends joining late need a new code. Keep expiry? | **No expiry**; the owner can regenerate if it leaks. Simpler for users. |
| OQ-6 | 6-digit codes are guessable by brute force. Acceptable? | **Keep 6 digits** (easy to type) but rate-limit attempts per user via rules design. |
| OQ-7 | Shareable join link (`evenly.app/join/123456`) in addition to the code? | **Yes**: tapping the link is easier than typing a code. |
| OQ-8 | Removing members / leaving a trip: text exists, no UI. Add? | **Yes**: owner removes members, members leave; blocked if they have expenses (MEM-5). Owner can't leave. |
| OQ-9 | When someone joins, can they "claim" a guest with their name (so past expenses become theirs)? | **Yes**: during join, "Are you one of these guests?" list, optional. |
| OQ-10 | EUR formatting: the old app shows `€ 1,234.56`. Use European style `1.234,56 €`? | **Format by the user's language**, not the currency: PT-BR users see `1.234,56`, EN users `1,234.56`; the symbol comes from the currency. |
| OQ-11 | Who can edit/delete an expense? Old rules: its creator or the owner. | **Any member**: friends trust each other, and it removes "why can't I fix this" moments. |
| OQ-12 | Leftover cents in a split: who absorbs them? | **The payer, if they participate; otherwise the first participant in member order.** |
| OQ-13 | Record a settlement payment ("B paid A 33.33") so balances go to zero? | **Yes**: "Mark as paid" on a suggestion creates a payment entry (a special expense). It's the most natural next step and removes the need for side notes. |
| OQ-14 | Expense date: the old app only stores the creation time. Let the user pick a date? | **No** for now (KISS). |
| OQ-15 | Uneven splits (by amount/percent/shares)? | **No** for now; equal splits only. |
| OQ-16 | More currencies than BRL, USD, EUR, GBP? | **Keep these 4**; trivial to extend later. |
| OQ-17 | Offline use? | **No** (online only, per earlier decision). Show a clear banner when offline. |
