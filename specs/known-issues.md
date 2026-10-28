# Known issues in the old app (do not repeat)

| # | Issue | Effect | Rule for the rebuild |
|---|---|---|---|
| KI-1 | Home loaded **every trip in the database**, then ran one extra query per trip to check membership. It re-ran on any change to any trip. | Slow loading that grows with total users; heavy read costs. | Home reads only the user's trips with **one** live query. |
| KI-2 | Joining only showed up because the app wrote a dummy timestamp on the trip to "poke" the list; membership changes alone didn't trigger an update. | "Joined a trip, nothing on Home until restart." | Membership is something the Home query directly watches. No poking. |
| KI-3 | Several pieces of data were one-off reads (current member, profile, member names) instead of live. | Stale names and screens until restart. | Everything on screen is live (TRIP-5, MEM-3). |
| KI-4 | Security rules let **any signed-in user read every trip, member list and expense**, and let anyone add themselves to any trip. | Privacy leak; anyone could join any trip without a code. | Only members read trip data; joining requires a valid code (TRIP-8, INV-5). |
| KI-5 | Trip deletion deleted children one by one from the client, not atomically. | Half-deleted trips on failure. | Deletion is atomic or safely resumable. |
| KI-6 | Expense writes didn't validate amount, payer or participants on the server. | Corrupt data possible. | Rules validate shape and membership (EXP-1, EXP-6). |
| KI-7 | Many texts/features existed without UI (rename trip, edit profile, remove member, deactivate code). | Dead code; inconsistent UX. | Only build what's in the specs. |
| KI-8 | Number formatting was hand-written per currency, with EUR formatted US-style. | Inconsistent amounts. | Use the platform's locale formatting (OQ-10). |
| KI-9 | Amount input stripped non-digits from free text. | Confusing entry. | Dedicated cents-based amount input (EXP-2). |
| KI-10 | Flutter web loaded a large rendering engine before showing anything. | Slow first load. | Lightweight web build (APP-4). |
| KI-11 | Names were resolved with marker strings like `{{YOU}}` swapped in later. | Fragile, sometimes leaked into UI. | Display names are computed in one place, localized directly. |
